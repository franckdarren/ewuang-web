// pages/api/variations/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/variations/create:
 *   post:
 *     summary: Crée une nouvelle variation
 *     description: >
 *       Crée une variation (taille, couleur) pour un article.
 *       Seul le propriétaire de l'article ou un admin peut créer une variation.
 *     tags:
 *       - Variations
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
 *                 description: ID de l'article parent
 *               couleur:
 *                 type: string
 *                 maxLength: 255
 *                 description: Couleur de la variation
 *               taille:
 *                 type: string
 *                 maxLength: 255
 *                 description: Taille de la variation
 *               stock:
 *                 type: integer
 *                 default: 0
 *                 description: Quantité en stock
 *               prix:
 *                 type: integer
 *                 description: Prix spécifique (optionnel, sinon prix de l'article)
 *               image:
 *                 type: string
 *                 maxLength: 255
 *                 description: URL de l'image spécifique
 *     responses:
 *       201:
 *         description: Variation créée avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (pas propriétaire)
 *       404:
 *         description: Article introuvable
 *       500:
 *         description: Erreur serveur
 */

const createVariationSchema = z.object({
    article_id: z.string().uuid(),
    couleur: z.string().max(255).optional(),
    taille: z.string().max(255).optional(),
    stock: z.number().int().nonnegative().optional().default(0),
    prix: z.number().int().nonnegative().optional(),
    image: z.string().max(255).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = createVariationSchema.parse(req.body);

        // Vérifier qu'au moins couleur ou taille est fourni
        if (!body.couleur && !body.taille) {
            return res.status(400).json({
                error: "Au moins une couleur ou une taille doit être fournie",
            });
        }

        // Vérifier que l'article existe
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id, user_id")
            .eq("id", body.article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Vérifier les permissions (propriétaire ou admin)
        const isOwner = article.user_id === profile.id;
        const isAdmin = profile.role === "Administrateur";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: "Vous ne pouvez créer des variations que pour vos propres articles",
            });
        }

        // Créer la variation
        const { data: variation, error: insertError } = await supabaseAdmin
            .from("variations")
            .insert({
                article_id: body.article_id,
                couleur: body.couleur || null,
                taille: body.taille || null,
                stock: body.stock,
                prix: body.prix || null,
                image: body.image || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            return res.status(500).json({ error: "Impossible de créer la variation" });
        }

        // Si un stock est fourni, créer également l'entrée dans la table stocks
        if (body.stock && body.stock > 0) {
            await supabaseAdmin.from("stocks").insert({
                variation_id: variation.id,
                quantite: body.stock,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        return res.status(201).json({
            message: "Variation créée avec succès",
            variation,
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
        console.error("Error /api/variations/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}