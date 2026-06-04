// pages/api/chat/contact-admin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import {
    resolveThreadType,
    orderParticipants,
    participantSlot,
} from "../../../lib/chat";

/**
 * @swagger
 * /api/chat/contact-admin:
 *   post:
 *     summary: Ouvre (ou retrouve) un fil de discussion avec un administrateur actif
 *     description: |
 *       Endpoint pratique pour les rôles Boutique / Client / Livreur : trouve
 *       automatiquement un compte Administrateur actif et ouvre/retrouve un fil
 *       avec lui. Évite d'exposer l'identifiant des admins côté client.
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Fil existant }
 *       201: { description: Fil créé }
 *       404: { description: Aucun administrateur disponible }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    if (profile.role === "Administrateur") {
        return res
            .status(400)
            .json({ error: "Un administrateur ne peut pas contacter le support" });
    }

    const { data: admin, error: adminErr } = await supabaseAdmin
        .from("users")
        .select("id, name, role, url_logo, is_active")
        .eq("role", "Administrateur")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (adminErr) {
        console.error("Erreur recherche admin:", adminErr);
        return res.status(500).json({ error: "Erreur serveur" });
    }
    if (!admin) {
        return res
            .status(404)
            .json({ error: "Aucun administrateur disponible pour le moment" });
    }

    const type = resolveThreadType(profile.role, admin.role);
    if (!type) {
        return res
            .status(403)
            .json({ error: "Discussion non autorisée avec un administrateur" });
    }

    const [a, b] = orderParticipants(profile.id, admin.id);

    const { data: existing } = await supabaseAdmin
        .from("chat_threads")
        .select("*")
        .eq("participant_a_id", a)
        .eq("participant_b_id", b)
        .is("commande_id", null)
        .is("reclamation_id", null);

    const match = (existing ?? [])[0];
    if (match) {
        const slot = participantSlot(match, profile.id);
        return res.status(200).json({
            thread: {
                ...match,
                interlocuteur: admin,
                unread: slot === "a" ? match.unread_count_a : match.unread_count_b,
            },
            created: false,
        });
    }

    const { data: created, error: insertErr } = await supabaseAdmin
        .from("chat_threads")
        .insert({
            id: uuidv4(),
            type,
            participant_a_id: a,
            participant_b_id: b,
            commande_id: null,
            reclamation_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (insertErr) {
        console.error("Erreur création fil contact-admin:", insertErr);
        return res
            .status(500)
            .json({ error: "Impossible de créer la discussion" });
    }

    return res.status(201).json({
        thread: { ...created, interlocuteur: admin, unread: 0 },
        created: true,
    });
}
