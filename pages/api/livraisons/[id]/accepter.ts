// pages/api/livraisons/[id]/accepter.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { getMessaging } from "../../../../app/lib/firebaseAdmin";

/**
 * @swagger
 * /api/livraisons/{id}/accepter:
 *   post:
 *     summary: Accepter une livraison disponible
 *     description: >
 *       Permet à un livreur de s'auto-assigner une livraison "En attente" ou "Reportée"
 *       (sans livreur assigné). Le livreur connecté est automatiquement assigné et le
 *       statut passe à "En cours de livraison".
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la livraison
 *     responses:
 *       200:
 *         description: Livraison acceptée avec succès
 *       400:
 *         description: Livraison non disponible (déjà assignée ou statut incorrect)
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (rôle non livreur)
 *       404:
 *         description: Livraison introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Livreur") {
            return res.status(403).json({ error: "Seuls les livreurs peuvent accepter une livraison" });
        }

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de livraison invalide" });
        }

        // Récupérer la livraison avec les infos nécessaires aux notifications
        const { data: livraison, error: fetchError } = await supabaseAdmin
            .from("livraisons")
            .select(`
                id,
                statut,
                livreur_id,
                commande_id,
                commandes (
                    id,
                    numero,
                    user_id,
                    commande_articles (
                        articles (user_id)
                    )
                )
            `)
            .eq("id", id)
            .single();

        if (fetchError || !livraison) {
            return res.status(404).json({ error: "Livraison introuvable" });
        }

        if (livraison.livreur_id !== null) {
            return res.status(400).json({ error: "Cette livraison est déjà assignée à un livreur" });
        }

        if (livraison.statut !== "En attente" && livraison.statut !== "Reportée") {
            return res.status(400).json({ error: "Seules les livraisons 'En attente' ou 'Reportée' peuvent être acceptées" });
        }

        // Assigner le livreur et passer en cours
        const { data: updated, error: updateError } = await supabaseAdmin
            .from("livraisons")
            .update({
                livreur_id: profile.id,
                statut: "En cours de livraison",
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select(`
                *,
                commandes (id, numero, statut),
                users (id, name, email, phone)
            `)
            .single();

        if (updateError) {
            console.error("Accepter livraison error:", updateError);
            return res.status(500).json({ error: "Impossible d'accepter la livraison" });
        }

        // Synchroniser le statut de la commande
        await supabaseAdmin
            .from("commandes")
            .update({ statut: "En cours de livraison", updated_at: new Date().toISOString() })
            .eq("id", livraison.commande_id);

        // 🔔 Notifier la boutique et le client que la livraison est prise en charge
        try {
            const commande = livraison.commandes as any;
            const commandeNumero = commande?.numero ?? "";

            const boutiqueIds: string[] = [
                ...new Set<string>(
                    (commande?.commande_articles ?? [])
                        .map((ca: any) => ca.articles?.user_id)
                        .filter(Boolean)
                ),
            ];
            const clientId: string | null = commande?.user_id ?? null;

            const titre = "Livraison en cours";
            const messageClient = `Votre commande #${commandeNumero} est en cours de livraison.`;
            const messageBoutique = `La commande #${commandeNumero} est en cours de livraison.`;
            const now = new Date().toISOString();

            const notifications: object[] = [];
            if (clientId) {
                notifications.push({
                    user_id: clientId,
                    type: "Livraison",
                    titre,
                    message: messageClient,
                    lien: "/client/commandes",
                    is_read: false,
                    created_at: now,
                });
            }
            for (const bId of boutiqueIds) {
                notifications.push({
                    user_id: bId,
                    type: "Livraison",
                    titre,
                    message: messageBoutique,
                    lien: "/boutique/commandes",
                    is_read: false,
                    created_at: now,
                });
            }
            if (notifications.length > 0) {
                await supabaseAdmin.from("notifications").insert(notifications);
            }

            const destinataireIds = [...(clientId ? [clientId] : []), ...boutiqueIds];
            if (destinataireIds.length > 0) {
                const { data: destinataires } = await supabaseAdmin
                    .from("users")
                    .select("id, fcm_token")
                    .in("id", destinataireIds);

                if (destinataires) {
                    const clientToken = destinataires.find((u: any) => u.id === clientId)?.fcm_token;
                    const boutiqueTokens = destinataires
                        .filter((u: any) => boutiqueIds.includes(u.id) && u.fcm_token)
                        .map((u: any) => u.fcm_token as string);

                    const fcmJobs: Array<{ tokens: string[]; body: string }> = [];
                    if (clientToken) fcmJobs.push({ tokens: [clientToken], body: messageClient });
                    if (boutiqueTokens.length > 0) fcmJobs.push({ tokens: boutiqueTokens, body: messageBoutique });

                    for (const job of fcmJobs) {
                        await getMessaging().sendEachForMulticast({
                            tokens: job.tokens,
                            notification: { title: titre, body: job.body },
                            data: { type: "livraison", route: "/commandes" },
                            android: {
                                priority: "high",
                                notification: { channelId: "commandes", sound: "default", priority: "max" },
                            },
                            apns: { payload: { aps: { sound: "default", badge: 1 } } },
                        });
                    }
                }
            }
        } catch (notifError) {
            console.error("Erreur notifications accepter livraison:", notifError);
        }

        return res.status(200).json({
            message: "Livraison acceptée avec succès",
            livraison: updated,
        });
    } catch (err) {
        console.error("Error /api/livraisons/[id]/accepter:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
