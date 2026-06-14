// pages/api/chat/threads/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { resolveBoutiqueIdFor } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import {
    resolveThreadType,
    orderParticipants,
    participantSlot,
} from "../../../../lib/chat";

/**
 * @swagger
 * /api/chat/threads:
 *   get:
 *     summary: Liste les fils de discussion de l'utilisateur connecté
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des fils }
 *   post:
 *     summary: Ouvre (ou retrouve) un fil de discussion avec un utilisateur
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [target_user_id]
 *             properties:
 *               target_user_id: { type: string, format: uuid }
 *               commande_id: { type: string, format: uuid }
 *               reclamation_id: { type: string, format: uuid }
 *     responses:
 *       200: { description: Fil existant }
 *       201: { description: Fil créé }
 *       403: { description: Combinaison de rôles non autorisée }
 */

const createSchema = z.object({
    target_user_id: z.string().uuid(),
    commande_id: z.string().uuid().optional(),
    reclamation_id: z.string().uuid().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    // Phase 2 : pour un gérant Boutique, les fils sont attachés au boutique_id
    // (= proprio.id). On utilise donc boutique_id comme identité pour
    // GET/POST côté Boutique. Pour les autres rôles, c'est profile.id.
    const boutiqueId = await resolveBoutiqueIdFor(profile.id, profile.role);
    const chatIdentity = boutiqueId ?? profile.id;

    // ---------- LISTE DES FILS ----------
    if (req.method === "GET") {
        const { data: threads, error } = await supabaseAdmin
            .from("chat_threads")
            .select("*")
            .or(`participant_a_id.eq.${chatIdentity},participant_b_id.eq.${chatIdentity}`)
            .order("last_message_at", { ascending: false, nullsFirst: false });

        if (error) {
            console.error("Erreur liste fils:", error);
            return res.status(500).json({ error: "Impossible de charger les discussions" });
        }

        const others = (threads ?? []).map((t) =>
            t.participant_a_id === chatIdentity ? t.participant_b_id : t.participant_a_id
        );

        let usersById: Record<string, any> = {};
        if (others.length > 0) {
            const { data: users } = await supabaseAdmin
                .from("users")
                .select("id, name, url_logo, role, auth_id")
                .in("id", others);
            usersById = Object.fromEntries(
                await Promise.all(
                    (users ?? []).map(async (u) => {
                        let url_logo = u.url_logo;
                        if (!url_logo && u.auth_id) {
                            const { data } = await supabaseAdmin.auth.admin.getUserById(u.auth_id);
                            url_logo =
                                data?.user?.user_metadata?.avatar_url ||
                                data?.user?.user_metadata?.picture ||
                                null;
                        }
                        return [u.id, { ...u, url_logo }];
                    })
                )
            );
        }

        const result = (threads ?? []).map((t) => {
            const slot = participantSlot(t, chatIdentity);
            const otherId =
                t.participant_a_id === chatIdentity ? t.participant_b_id : t.participant_a_id;
            return {
                ...t,
                interlocuteur: usersById[otherId] ?? null,
                unread: slot === "a" ? t.unread_count_a : t.unread_count_b,
            };
        });

        return res.status(200).json({ threads: result });
    }

    // ---------- OUVRIR / RETROUVER UN FIL ----------
    if (req.method === "POST") {
        try {
            const body = createSchema.parse(req.body);

            if (body.target_user_id === chatIdentity) {
                return res
                    .status(400)
                    .json({ error: "Impossible d'ouvrir une discussion avec soi-même" });
            }

            const { data: target, error: targetErr } = await supabaseAdmin
                .from("users")
                .select("id, name, role, url_logo, is_active")
                .eq("id", body.target_user_id)
                .maybeSingle();

            if (targetErr || !target) {
                return res.status(404).json({ error: "Destinataire introuvable" });
            }
            if (target.is_active === false) {
                return res.status(403).json({ error: "Ce compte est désactivé" });
            }

            // Matrice d'autorisation
            const type = resolveThreadType(profile.role, target.role);
            if (!type) {
                return res.status(403).json({
                    error: `Discussion non autorisée entre un compte ${profile.role} et un compte ${target.role}`,
                });
            }

            const [a, b] = orderParticipants(chatIdentity, target.id);

            // Recherche d'un fil existant (même couple, même commande/réclamation)
            const { data: existing } = await supabaseAdmin
                .from("chat_threads")
                .select("*")
                .eq("participant_a_id", a)
                .eq("participant_b_id", b);

            const match = (existing ?? []).find(
                (t) =>
                    (t.commande_id ?? null) === (body.commande_id ?? null) &&
                    (t.reclamation_id ?? null) === (body.reclamation_id ?? null)
            );

            if (match) {
                return res.status(200).json({ thread: match, created: false });
            }

            const { data: created, error: insertErr } = await supabaseAdmin
                .from("chat_threads")
                .insert({
                    id: uuidv4(),
                    type,
                    participant_a_id: a,
                    participant_b_id: b,
                    commande_id: body.commande_id ?? null,
                    reclamation_id: body.reclamation_id ?? null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertErr) {
                console.error("Erreur création fil:", insertErr);
                return res.status(500).json({ error: "Impossible de créer la discussion" });
            }

            return res.status(201).json({ thread: created, created: true });
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(400).json({
                    errors: err.issues.map((i) => ({
                        field: i.path.join("."),
                        message: i.message,
                    })),
                });
            }
            console.error("Error POST /api/chat/threads:", err);
            return res.status(500).json({ error: "Erreur serveur interne" });
        }
    }

    return res.status(405).json({ error: "Méthode non autorisée" });
}
