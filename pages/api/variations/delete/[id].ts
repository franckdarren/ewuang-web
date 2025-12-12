// pages/api/variations/delete/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/variations/delete/{id}:
 *   delete:
 *     summary: Supprime une variation
 *     description: >
 *       Supprime une variation d'un article.
 *       Seul le propriétaire de l'article ou un admin peut supprimer.
 *     tags:
 *       - Variations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la variation
 *     responses:
 *       200:
 *         description: Variation supprimée avec succès
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Variation introuvable
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
            return res.status(400).json({ error: "ID de variation invalide" });
        }

        // Récupérer la variation et vérifier les permissions
        const { data: variation, error: fetchError } = await supabaseAdmin
            .from("variations")
            .select("*, articles!inner (user_id)")
            .eq("id", id)
            .single();

        if (fetchError || !variation) {
            return res.status(404).json({ error: "Variation introuvable" });
        }

        // Extraire l'article du tableau
        const article = Array.isArray(variation.articles) ? variation.articles[0] : variation.articles;

        // Vérifier les permissions
        const isOwner = article?.user_id === profile.id;
        const isAdmin = profile.role === "Administrateur";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: "Vous ne pouvez supprimer que vos propres variations",
            });
        }

        // Supprimer d'abord les stocks liés
        await supabaseAdmin.from("stocks").delete().eq("variation_id", id);

        // Supprimer les images liées
        await supabaseAdmin.from("image_articles").delete().eq("variation_id", id);

        // Supprimer la variation
        const { error: deleteError } = await supabaseAdmin
            .from("variations")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Supabase delete error:", deleteError);
            return res.status(500).json({ error: "Impossible de supprimer la variation" });
        }

        return res.status(200).json({
            message: "Variation supprimée avec succès",
            variation_id: id,
        });
    } catch (err) {
        console.error("Error /api/variations/delete/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}