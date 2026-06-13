// pages/api/livraisons/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { getMessaging } from "../../../app/lib/firebaseAdmin";

/**
 * @swagger
 * /api/livraisons/create:
 *   post:
 *     summary: Crée une nouvelle livraison
 *     description: >
 *       Crée une livraison pour une commande. Accessible aux administrateurs
 *       ou aux boutiques propriétaires des articles de la commande.
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commande_id
 *               - adresse
 *               - ville
 *               - phone
 *               - date_livraison
 *             properties:
 *               commande_id:
 *                 type: string
 *                 format: uuid
 *               adresse:
 *                 type: string
 *                 maxLength: 255
 *               details:
 *                 type: string
 *                 maxLength: 255
 *               ville:
 *                 type: string
 *                 maxLength: 255
 *               phone:
 *                 type: string
 *                 maxLength: 255
 *               date_livraison:
 *                 type: string
 *                 format: date-time
 *               statut:
 *                 type: string
 *                 maxLength: 255
 *                 default: "En attente"
 *                 enum:
 *                   - En attente
 *                   - En cours de livraison
 *                   - Livrée
 *                   - Annulée
 *                   - Reportée
 *     responses:
 *       201:
 *         description: Livraison créée avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Commande introuvable
 *       500:
 *         description: Erreur serveur
 */

const createLivraisonSchema = z.object({
    commande_id: z.string().uuid(),
    adresse: z.string().max(255).min(1),
    details: z.string().max(255).optional().default(""),
    ville: z.string().max(255).min(1),
    phone: z.string().max(255).min(1),
    date_livraison: z.string().datetime(),
    statut: z.string().max(255).optional().default("En attente"),
    livreur_id: z.string().uuid().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = createLivraisonSchema.parse(req.body);

        // Vérifier que la commande existe
        const { data: commande, error: commandeError } = await supabaseAdmin
            .from("commandes")
            .select(`
        id,
        user_id,
        numero,
        statut,
        commande_articles (
          articles (user_id)
        )
      `)
            .eq("id", body.commande_id)
            .single();

        if (commandeError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isBoutiqueOwner = commande.commande_articles?.some(
            (ca: any) => ca.articles?.user_id === profile.id
        );

        if (!isAdmin && !isBoutiqueOwner) {
            return res.status(403).json({
                error: "Accès refusé. Seuls les admins ou les boutiques concernées peuvent créer une livraison"
            });
        }

        // Vérifier qu'il n'existe pas déjà une livraison pour cette commande
        const { data: existingLivraison } = await supabaseAdmin
            .from("livraisons")
            .select("id")
            .eq("commande_id", body.commande_id)
            .single();

        if (existingLivraison) {
            return res.status(400).json({
                error: "Une livraison existe déjà pour cette commande"
            });
        }

        // Si un livreur est fourni, le statut passe automatiquement en cours
        const statutFinal = body.livreur_id
            ? "En cours de livraison"
            : (body.statut ?? "En attente");

        // Créer la livraison
        const { data: livraison, error: insertError } = await supabaseAdmin
            .from("livraisons")
            .insert({
                commande_id: body.commande_id,
                user_id: commande.user_id,
                livreur_id: body.livreur_id ?? null,
                adresse: body.adresse,
                details: body.details,
                ville: body.ville,
                phone: body.phone,
                date_livraison: body.date_livraison,
                statut: statutFinal,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select(`
        *,
        commandes (id, numero, statut, prix, user_id),
        users (id, name, email, phone)
      `)
            .single();

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            return res.status(500).json({ error: "Impossible de créer la livraison" });
        }

        // Mettre à jour le statut de la commande si nécessaire
        if (commande.statut === "En attente" || commande.statut === "en_preparation") {
            await supabaseAdmin
                .from("commandes")
                .update({ statut: "prete_pour_livraison" })
                .eq("id", body.commande_id);
        }

        // Notifier tous les livreurs si la livraison est en attente d'attribution
        if (statutFinal === "En attente") {
            try {
                const { data: livreurs } = await supabaseAdmin
                    .from("users")
                    .select("id, fcm_token")
                    .eq("role", "Livreur");

                if (livreurs && livreurs.length > 0) {
                    const titre = "Nouvelle livraison disponible !";
                    const message = `Une livraison vers ${body.ville} (${body.adresse}) est disponible. Acceptez-la maintenant.`;

                    // Notifications in-app (Supabase Realtime)
                    await supabaseAdmin.from("notifications").insert(
                        livreurs.map((l: { id: string; fcm_token: string | null }) => ({
                            user_id: l.id,
                            type: "livraison",
                            titre,
                            message,
                            lien: "/livreur/livraisons",
                            is_read: false,
                            created_at: new Date().toISOString(),
                        }))
                    );

                    // Notifications push FCM (app fermée / arrière-plan)
                    const fcmTokens = livreurs
                        .filter((l: { id: string; fcm_token: string | null }) => l.fcm_token)
                        .map((l: { id: string; fcm_token: string | null }) => l.fcm_token as string);

                    if (fcmTokens.length > 0) {
                        await getMessaging().sendEachForMulticast({
                            tokens: fcmTokens,
                            notification: { title: titre, body: message },
                            data: { type: "livraison", route: "/livreur/livraisons" },
                            android: {
                                priority: "high",
                                notification: {
                                    channelId: "livraisons",
                                    sound: "default",
                                    priority: "max",
                                },
                            },
                            apns: {
                                payload: { aps: { sound: "default", badge: 1 } },
                            },
                        });
                    }
                }
            } catch (notifError) {
                console.error("Erreur notification livreurs:", notifError);
            }
        }

        return res.status(201).json({
            message: "Livraison créée avec succès",
            livraison,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/livraisons/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}