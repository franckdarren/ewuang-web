import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Supprime une catégorie
 *     tags:
 *       - Catégories
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { profile } = auth;

    if (profile.role !== "Administrateur") {
        return res.status(403).json({ error: "Accès interdit" });
    }

    const { id } = req.query;

    try {
        const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("categorie_id", id as string);

        if (articles?.length) {
            return res.status(400).json({
                error: `Impossible de supprimer. ${articles.length} article(s) liés.`,
            });
        }

        const { data: children } = await supabaseAdmin
            .from("categories")
            .select("id")
            .eq("parent_id", id as string);

        if (children?.length) {
            return res.status(400).json({
                error: `Impossible de supprimer. ${children.length} sous-catégorie(s) existent.`,
            });
        }

        const { error } = await supabaseAdmin
            .from("categories")
            .delete()
            .eq("id", id as string);

        if (error) {
            console.error("Delete error:", error);
            return res.status(500).json({ error: "Erreur lors de la suppression" });
        }

        return res.status(200).json({ message: "Catégorie supprimée avec succès" });
    } catch (err) {
        console.error("DELETE category error:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
