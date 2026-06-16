// pages/api/livraisons/[id]/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { getMessaging } from "../../../../app/lib/firebaseAdmin";

/**
 * @swagger
 * /api/livraisons/{id}/update:
 *   patch:
 *     summary: Met à jour une livraison
 *     description: >
 *       Permet de modifier les informations d'une livraison.
 *       Accessible aux administrateurs ou au livreur assigné.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *     responses:
 *       200:
 *         description: Livraison mise à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livraison introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateLivraisonSchema = z.object({
    adresse: z.string().max(255).min(1).optional(),
    details: z.string().max(255).optional(),
    ville: z.string().max(255).min(1).optional(),
    phone: z.string().max(255).min(1).optional(),
    date_livraison: z.string().datetime().optional(),
    statut: z.enum([
        "En attente",
        "En cours de livraison",
        "Livrée",
        "Annulée",
        "Reportée"
    ]).optional(),
    livreur_id: z.string().uuid().optional(),
    commentaire: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
    if ((data.statut === "Annulée" || data.statut === "Reportée") && !data.commentaire?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["commentaire"],
            message: "Un commentaire est obligatoire pour annuler ou reporter une livraison",
        });
    }
    if (data.statut === "Reportée" && !data.date_livraison) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["date_livraison"],
            message: "La nouvelle date de livraison est obligatoire pour reporter une livraison",
        });
    }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de livraison invalide" });
        }

        const body = updateLivraisonSchema.parse(req.body);

        if (Object.keys(body).length === 0) {
            return res.status(400).json({
                error: "Au moins un champ doit être fourni pour la mise à jour"
            });
        }

        // 🔎 Récupérer la livraison avec les infos nécessaires aux notifications
        const { data: livraison, error: fetchError } = await supabaseAdmin
            .from("livraisons")
            .select(`
        id,
        statut,
        commande_id,
        livreur_id,
        commandes (
            id,
            numero,
            statut,
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

        const isAdmin = profile.role === "Administrateur";
        const isLivreur = livraison.livreur_id === profile.id;

        // 🔐 Permissions
        if (body.livreur_id && !isAdmin) {
            return res.status(403).json({
                error: "Seul un administrateur peut assigner un livreur"
            });
        }

        if (!isAdmin && !isLivreur) {
            return res.status(403).json({
                error: "Accès refusé"
            });
        }

        // 🛠 Construction de la mise à jour
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (body.adresse) updateData.adresse = body.adresse;
        if (body.details !== undefined) updateData.details = body.details;
        if (body.ville) updateData.ville = body.ville;
        if (body.phone) updateData.phone = body.phone;
        if (body.date_livraison) updateData.date_livraison = body.date_livraison;

        // 📦 Assignation livreur
        if (body.livreur_id) {
            updateData.livreur_id = body.livreur_id;
            updateData.statut = "En cours de livraison";
        }

        // 🚚 Mise à jour statut
        if (body.statut) {
            updateData.statut = body.statut;
            // Stocker le commentaire dans details pour Annulée/Reportée
            if ((body.statut === "Annulée" || body.statut === "Reportée") && body.commentaire) {
                updateData.details = body.commentaire.trim();
            }
            // 📅 Report : on libère le livreur actuel, la livraison redevient
            // disponible (à la nouvelle date) pour n'importe quel livreur de la flotte
            if (body.statut === "Reportée") {
                updateData.livreur_id = null;
            }
        }

        // 🔄 Mise à jour livraison
        const { data: updatedLivraison, error: updateError } =
            await supabaseAdmin
                .from("livraisons")
                .update(updateData)
                .eq("id", id)
                .select(`
          *,
            commandes (id, numero, statut),
            users (id, name, email, phone)
        `)
                .single();

        if (updateError) {
            console.error("Update livraison error:", updateError);
            return res.status(500).json({
                error: "Impossible de mettre à jour la livraison"
            });
        }

        // 🔁 Synchronisation statut commande
        if (body.statut || body.livreur_id) {
            let commandeStatut: string | null = null;

            if (updateData.statut === "En cours de livraison") {
                commandeStatut = "En cours de livraison";
            } else if (updateData.statut === "Livrée") {
                commandeStatut = "Livrée";
            } else if (updateData.statut === "Annulée") {
                commandeStatut = "Annulée";
            }
            // "Reportée" : la commande repasse en "Prête pour livraison"
            else if (updateData.statut === "Reportée") {
                commandeStatut = "Prête pour livraison";
            }

            if (commandeStatut) {
                await supabaseAdmin
                    .from("commandes")
                    .update({ statut: commandeStatut, updated_at: new Date().toISOString() })
                    .eq("id", livraison.commande_id);
            }
        }

        // 🔔 Notifier la boutique et le client du changement de statut
        if (updateData.statut) {
            try {
                const commande = livraison.commandes as any;
                const commandeNumero = commande?.numero ?? updatedLivraison?.commandes?.numero ?? "";

                // IDs uniques des propriétaires de boutique (articles de la commande)
                const boutiqueIds: string[] = [
                    ...new Set<string>(
                        (commande?.commande_articles ?? [])
                            .map((ca: any) => ca.articles?.user_id)
                            .filter(Boolean)
                    ),
                ];
                const clientId: string | null = commande?.user_id ?? null;

                let titreLivraison = "";
                let messageClient = "";
                let messageBoutique = "";

                switch (updateData.statut) {
                    case "En cours de livraison":
                        titreLivraison = "Livraison en cours";
                        messageClient = `Votre commande #${commandeNumero} est en cours de livraison.`;
                        messageBoutique = `La commande #${commandeNumero} est en cours de livraison.`;
                        break;
                    case "Livrée":
                        titreLivraison = "Commande livrée !";
                        messageClient = `Votre commande #${commandeNumero} a été livrée avec succès. Merci pour votre confiance !`;
                        messageBoutique = `La commande #${commandeNumero} a été livrée avec succès.`;
                        break;
                    case "Annulée":
                        titreLivraison = "Livraison annulée";
                        messageClient = `La livraison de votre commande #${commandeNumero} a été annulée.`;
                        messageBoutique = `La livraison de la commande #${commandeNumero} a été annulée.`;
                        break;
                    case "Reportée": {
                        const nouvelleDate = updateData.date_livraison
                            ? new Date(updateData.date_livraison).toLocaleDateString("fr-FR")
                            : null;
                        const suffixeDate = nouvelleDate ? ` Nouvelle date proposée : ${nouvelleDate}.` : "";
                        titreLivraison = "Livraison reportée";
                        messageClient = `La livraison de votre commande #${commandeNumero} a été reportée.${suffixeDate}`;
                        messageBoutique = `La livraison de la commande #${commandeNumero} a été reportée.${suffixeDate}`;
                        break;
                    }
                }

                if (titreLivraison) {
                    const now = new Date().toISOString();

                    // Construire les notifications in-app
                    const notifications: object[] = [];
                    if (clientId) {
                        notifications.push({
                            user_id: clientId,
                            type: "livraison",
                            titre: titreLivraison,
                            message: messageClient,
                            lien: "/client/commandes",
                            is_read: false,
                            created_at: now,
                        });
                    }
                    for (const bId of boutiqueIds) {
                        notifications.push({
                            user_id: bId,
                            type: "livraison",
                            titre: titreLivraison,
                            message: messageBoutique,
                            lien: "/boutique/commandes",
                            is_read: false,
                            created_at: now,
                        });
                    }
                    if (notifications.length > 0) {
                        await supabaseAdmin.from("notifications").insert(notifications);
                    }

                    // Récupérer les tokens FCM pour les notifications push
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
                                    notification: { title: titreLivraison, body: job.body },
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
                }
            } catch (notifError) {
                console.error("Erreur notifications statut livraison:", notifError);
            }
        }

        return res.status(200).json({
            message: "Livraison mise à jour avec succès",
            livraison: updatedLivraison,
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

        console.error("Error /api/livraisons/[id]/update:", err);
        return res.status(500).json({
            error: "Erreur serveur interne"
        });
    }
}