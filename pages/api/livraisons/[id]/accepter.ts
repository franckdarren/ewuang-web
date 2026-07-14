// pages/api/livraisons/[id]/accepter.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { envoyerPushFCM } from "../../../../app/lib/sendPushFCM";

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
                    statut,
                    user_id,
                    groupe_id,
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

        // Garde métier : la boutique doit d'abord avoir préparé la commande et
        // l'avoir passée en "Prête pour livraison". La livraison est créée dès le
        // paiement (statut "En attente"), mais elle ne devient réellement
        // acceptable qu'à partir de ce moment (cf. filtre livraisons/disponibles).
        const commandeLiee = livraison.commandes as { statut?: string } | null;
        if (commandeLiee?.statut !== "Prête pour livraison") {
            return res.status(400).json({
                error: "Cette commande n'est pas encore prête pour la livraison",
            });
        }

        // Assigner le livreur et passer en cours.
        // Verrou optimiste (.is("livreur_id", null)) : si un autre livreur a
        // accepté entre-temps, la mise à jour ne touche aucune ligne.
        const { data: updatedRows, error: updateError } = await supabaseAdmin
            .from("livraisons")
            .update({
                livreur_id: profile.id,
                statut: "En cours de livraison",
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .is("livreur_id", null)
            .select(`
                *,
                commandes (id, numero, statut),
                users (id, name, email, phone)
            `);

        if (updateError) {
            console.error("Accepter livraison error:", updateError);
            return res.status(500).json({ error: "Impossible d'accepter la livraison" });
        }

        if (!updatedRows || updatedRows.length === 0) {
            return res.status(409).json({ error: "Cette livraison vient d'être acceptée par un autre livreur" });
        }

        const updated = updatedRows[0];

        // Synchroniser le statut de la commande
        await supabaseAdmin
            .from("commandes")
            .update({ statut: "En cours de livraison", updated_at: new Date().toISOString() })
            .eq("id", livraison.commande_id);

        const commande = livraison.commandes as any;

        // 🔗 Cascade : attribuer automatiquement les sous-commandes sœurs déjà
        // prêtes (autres boutiques de la même commande groupée) au même livreur.
        const boutiquesTraitees: { numero: string; boutiqueIds: string[] }[] = [
            {
                numero: commande?.numero ?? "",
                boutiqueIds: [
                    ...new Set<string>(
                        (commande?.commande_articles ?? [])
                            .map((ca: any) => ca.articles?.user_id)
                            .filter(Boolean)
                    ),
                ],
            },
        ];

        if (commande?.groupe_id) {
            const { data: soeurs } = await supabaseAdmin
                .from("commandes")
                .select(`
                    id,
                    numero,
                    statut,
                    commande_articles ( articles (user_id) ),
                    livraisons ( id, statut, livreur_id )
                `)
                .eq("groupe_id", commande.groupe_id)
                .neq("id", livraison.commande_id)
                .eq("statut", "Prête pour livraison");

            for (const soeur of soeurs ?? []) {
                const livraisonSoeur = (soeur as any).livraisons?.[0];
                if (!livraisonSoeur) continue;
                if (livraisonSoeur.livreur_id !== null) continue;
                if (!["En attente", "Reportée"].includes(livraisonSoeur.statut)) continue;

                const { data: cascadeRows } = await supabaseAdmin
                    .from("livraisons")
                    .update({
                        livreur_id: profile.id,
                        statut: "En cours de livraison",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", livraisonSoeur.id)
                    .is("livreur_id", null)
                    .select("id");

                if (!cascadeRows || cascadeRows.length === 0) continue; // un autre livreur a été plus rapide

                await supabaseAdmin
                    .from("commandes")
                    .update({ statut: "En cours de livraison", updated_at: new Date().toISOString() })
                    .eq("id", soeur.id);

                boutiquesTraitees.push({
                    numero: (soeur as any).numero ?? "",
                    boutiqueIds: [
                        ...new Set<string>(
                            ((soeur as any).commande_articles ?? [])
                                .map((ca: any) => ca.articles?.user_id)
                                .filter(Boolean)
                        ),
                    ],
                });
            }
        }

        // 🔔 Notifier les boutiques traitées et le client (une seule notif client
        // globale, même si plusieurs sous-commandes ont été cascadées).
        try {
            const clientId: string | null = commande?.user_id ?? null;
            const now = new Date().toISOString();
            const titre = "Livraison en cours";

            const notifications: object[] = [];
            for (const { numero, boutiqueIds } of boutiquesTraitees) {
                const messageBoutique = `La commande #${numero} est en cours de livraison.`;
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
                if (boutiqueIds.length > 0) {
                    await envoyerPushFCM(boutiqueIds, {
                        type: "Livraison", titre, message: messageBoutique, lien: "/boutique/commandes",
                    });
                }
            }

            if (clientId) {
                const messageClient = boutiquesTraitees.length > 1
                    ? `Votre commande #${boutiquesTraitees[0].numero} (${boutiquesTraitees.length} boutiques) est en cours de livraison.`
                    : `Votre commande #${boutiquesTraitees[0].numero} est en cours de livraison.`;

                notifications.push({
                    user_id: clientId,
                    type: "Livraison",
                    titre,
                    message: messageClient,
                    lien: "/client/commandes",
                    is_read: false,
                    created_at: now,
                });

                await envoyerPushFCM([clientId], {
                    type: "Livraison", titre, message: messageClient, lien: "/client/commandes",
                });
            }

            if (notifications.length > 0) {
                await supabaseAdmin.from("notifications").insert(notifications);
            }
        } catch (notifError) {
            console.error("Erreur notifications accepter livraison:", notifError);
        }

        return res.status(200).json({
            message: "Livraison acceptée avec succès",
            livraison: updated,
            livraisons_cascadees: boutiquesTraitees.length - 1,
        });
    } catch (err) {
        console.error("Error /api/livraisons/[id]/accepter:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
