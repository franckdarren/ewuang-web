// pages/api/favorites/remove/[article_id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/favorites/remove/{article_id}:
 *   delete:
 *     summary: Retire un article des favoris
 *     description: Supprime un article de la liste des favoris de l'utilisateur connecté
 *     tags:
 *       - Favoris
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: article_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'article à retirer des favoris
 *     responses:
 *       200:
 *         description: Article retiré des favoris
 *       404:
 *         description: Article pas dans les favoris
 *       401:
 *         description: Non autorisé
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

        const { article_id } = req.query;

        if (!article_id || typeof article_id !== "string") {
            return res.status(400).json({ error: "ID d'article invalide" });
        }

        // Vérifier que l'article est dans les favoris
        const { data: favorite, error: fetchError } = await supabaseAdmin
            .from("favoris")
            .select("id")
            .eq("user_id", profile.id)
            .eq("article_id", article_id)
            .single();

        if (fetchError || !favorite) {
            return res.status(404).json({ error: "Article pas dans vos favoris" });
        }

        // Supprimer des favoris
        const { error: deleteError } = await supabaseAdmin
            .from("favoris")
            .delete()
            .eq("user_id", profile.id)
            .eq("article_id", article_id);

        if (deleteError) {
            console.error("Supabase delete error:", deleteError);
            return res.status(500).json({ error: "Impossible de retirer des favoris" });
        }

        return res.status(200).json({
            message: "Article retiré des favoris",
            article_id,
        });
    } catch (err) {
        console.error("Error /api/favorites/remove/[article_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}