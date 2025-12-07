// pages/api/livraisons/[id]/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/{id}/delete:
 *   delete:
 *     summary: Supprime une livraison
 *     description: >
 *       Supprime une livraison. Accessible uniquement aux administrateurs.
 *       La livraison ne peut être supprimée que si elle n'a pas encore été livrée.
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
 *         description: Livraison supprimée avec succès
 *       400:
 *         description: La livraison ne peut pas être supprimée (déjà livrée)
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
 *       404:
 *         description: Livraison introuvable
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

        // Vérifier que l'utilisateur est admin
        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de livraison invalide" });
        }

        // Récupérer la livraison
        const { data: livraison, error: fetchError } = await supabaseAdmin
            .from("livraisons")
            .select("*, commandes (id, statut)")
            .eq("id", id)
            .single();

        if (fetchError || !livraison) {
            return res.status(404).json({ error: "Livraison introuvable" });
        }

        // Vérifier que la livraison n'a pas été effectuée
        const statutsNonSupprimables = ["Livrée", "Livré", "livree", "livre"];
        if (statutsNonSupprimables.some(s => livraison.statut?.toLowerCase().includes(s.toLowerCase()))) {
            return res.status(400).json({
                error: "Impossible de supprimer une livraison déjà effectuée",
            });
        }

        // Supprimer la livraison
        const { error: deleteError } = await supabaseAdmin
            .from("livraisons")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Supabase delete error:", deleteError);
            return res.status(500).json({ error: "Impossible de supprimer la livraison" });
        }

        // Mettre à jour le statut de la commande si nécessaire
        if (livraison.commande_id) {
            await supabaseAdmin
                .from("commandes")
                .update({ statut: "en_preparation" })
                .eq("id", livraison.commande_id);
        }

        return res.status(200).json({
            message: "Livraison supprimée avec succès",
            livraison_id: id,
        });
    } catch (err) {
        console.error("Error /api/livraisons/[id]/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}