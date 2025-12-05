// pages/api/commandes/[id]/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/{id}/delete:
 *   delete:
 *     summary: Supprime une commande
 *     description: >
 *       Supprime une commande et toutes ses relations (articles, livraisons, réclamations).
 *       Seuls les administrateurs ou les propriétaires de la commande peuvent la supprimer.
 *       La commande doit être en statut "en_attente" ou "annule" pour être supprimable.
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la commande
 *     responses:
 *       200:
 *         description: Commande supprimée avec succès
 *       400:
 *         description: La commande ne peut pas être supprimée (statut invalide)
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Commande introuvable
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de commande invalide" });
        }

        // Récupérer la commande
        const { data: commande, error: fetchError } = await supabaseAdmin
            .from("commandes")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isOwner = commande.user_id === profile.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: "Accès refusé pour supprimer cette commande" });
        }

        // Vérifier que la commande peut être supprimée (statut approprié)
        const deletableStatuses = ["En attente", "Annulée"];
        if (!deletableStatuses.includes(commande.statut)) {
            return res.status(400).json({
                error: `Impossible de supprimer une commande avec le statut "${commande.statut}". Seules les commandes "En attente" ou "Annulée" peuvent être supprimées.`,
            });
        }

        // Début de la transaction de suppression
        try {
            // 1. Supprimer les réclamations liées
            const { error: reclamationsError } = await supabaseAdmin
                .from("reclamations")
                .delete()
                .eq("commande_id", id);

            if (reclamationsError) {
                console.warn("Erreur suppression réclamations:", reclamationsError);
            }

            // 2. Supprimer les livraisons liées
            const { error: livraisonsError } = await supabaseAdmin
                .from("livraisons")
                .delete()
                .eq("commande_id", id);

            if (livraisonsError) {
                console.warn("Erreur suppression livraisons:", livraisonsError);
            }

            // 3. Restaurer les stocks si la commande était en attente
            if (commande.statut === "en_attente") {
                const { data: commandeArticles } = await supabaseAdmin
                    .from("commande_articles")
                    .select("variation_id, quantite")
                    .eq("commande_id", id);

                if (commandeArticles) {
                    for (const ca of commandeArticles) {
                        if (ca.variation_id) {
                            await supabaseAdmin.rpc("increment_variation_stock", {
                                variation_id: ca.variation_id,
                                quantity: ca.quantite,
                            });
                        }
                    }
                }
            }

            // 4. Supprimer les articles de la commande
            const { error: articleCommandeError } = await supabaseAdmin
                .from("commande_articles")
                .delete()
                .eq("commande_id", id);

            if (articleCommandeError) {
                throw new Error(`Erreur suppression articles: ${articleCommandeError.message}`);
            }

            // 5. Supprimer la table pivot article_commandes (si utilisée)
            const { error: articleCommandesError } = await supabaseAdmin
                .from("article_commandes")
                .delete()
                .eq("commande_id", id);

            if (articleCommandesError) {
                console.warn("Erreur suppression article_commandes:", articleCommandesError);
            }

            // 6. Supprimer la commande
            const { error: deleteError } = await supabaseAdmin
                .from("commandes")
                .delete()
                .eq("id", id);

            if (deleteError) {
                throw new Error(`Erreur suppression commande: ${deleteError.message}`);
            }

            return res.status(200).json({
                message: "Commande supprimée avec succès",
                commande_id: id,
            });
        } catch (transactionError: any) {
            console.error("Transaction error:", transactionError);
            return res.status(500).json({
                error: "Erreur lors de la suppression de la commande",
                details: transactionError.message,
            });
        }
    } catch (err) {
        console.error("Error /api/commandes/[id]/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}