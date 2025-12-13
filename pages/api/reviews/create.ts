// pages/api/reviews/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reviews/create:
 *   post:
 *     summary: Crée un avis sur un article
 *     description: >
 *       Permet à un utilisateur de laisser une note et un commentaire sur un article.
 *       Un utilisateur ne peut laisser qu'un seul avis par article.
 *     tags:
 *       - Avis
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
 *               - note
 *             properties:
 *               article_id:
 *                 type: string
 *                 format: uuid
 *               note:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Note de 1 à 5 étoiles
 *               commentaire:
 *                 type: string
 *                 description: Commentaire optionnel
 *     responses:
 *       201:
 *         description: Avis créé avec succès
 *       400:
 *         description: Données invalides ou avis déjà existant
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Article introuvable
 *       500:
 *         description: Erreur serveur
 */

const createReviewSchema = z.object({
    article_id: z.string().uuid(),
    note: z.number().int().min(1).max(5),
    commentaire: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = createReviewSchema.parse(req.body);

        // Vérifier que l'article existe
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id, nom")
            .eq("id", body.article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Vérifier si l'utilisateur a déjà laissé un avis
        const { data: existing } = await supabaseAdmin
            .from("avis")
            .select("id")
            .eq("user_id", profile.id)
            .eq("article_id", body.article_id)
            .single();

        if (existing) {
            return res.status(400).json({
                error: "Vous avez déjà laissé un avis sur cet article"
            });
        }

        // Créer l'avis
        const { data: review, error: insertError } = await supabaseAdmin
            .from("avis")
            .insert({
                user_id: profile.id,
                article_id: body.article_id,
                note: body.note,
                commentaire: body.commentaire || null,
                is_moderated: false,
                is_visible: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select(`
        *,
        users!inner (id, name),
        articles!inner (id, nom)
      `)
            .single();

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            return res.status(500).json({ error: "Impossible de créer l'avis" });
        }

        return res.status(201).json({
            message: "Avis créé avec succès",
            review,
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
        console.error("Error /api/reviews/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}