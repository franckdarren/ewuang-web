// pages/api/favorites/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/favorites/add:
 *   post:
 *     summary: Ajoute un article aux favoris
 *     description: Ajoute un article à la liste des favoris de l'utilisateur connecté
 *     tags:
 *       - Favoris
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - article_id
 *             properties:
 *               article_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'article à ajouter aux favoris
 *     responses:
 *       201:
 *         description: Article ajouté aux favoris
 *       400:
 *         description: Article déjà dans les favoris
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Article introuvable
 *       500:
 *         description: Erreur serveur
 */

const addFavoriteSchema = z.object({
    article_id: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = addFavoriteSchema.parse(req.body);

        // Vérifier que l'article existe
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id, nom")
            .eq("id", body.article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Vérifier si déjà en favoris
        const { data: existing } = await supabaseAdmin
            .from("favoris")
            .select("id")
            .eq("user_id", profile.id)
            .eq("article_id", body.article_id)
            .single();

        if (existing) {
            return res.status(400).json({ error: "Article déjà dans vos favoris" });
        }

        // Ajouter aux favoris
        const { data: favorite, error: insertError } = await supabaseAdmin
            .from("favoris")
            .insert({
                user_id: profile.id,
                article_id: body.article_id,
                created_at: new Date().toISOString(),
            })
            .select(`
        *,
        articles (id, nom, prix, prix_promotion, is_promotion, image_principale)
      `)
            .single();

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            return res.status(500).json({ error: "Impossible d'ajouter aux favoris" });
        }

        return res.status(201).json({
            message: "Article ajouté aux favoris",
            favorite,
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
        console.error("Error /api/favorites/add:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}