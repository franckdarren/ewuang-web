// pages/api/articles/update/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/articles/update/{id}:
 *   patch:
 *     summary: Met à jour un article (propriétaire uniquement)
 *     description: >
 *       Met à jour un article existant. Seul le propriétaire (user_id) peut modifier.
 *       Si categorie_id est fourni, vérifie que la catégorie existe et est active.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'article à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               prix:
 *                 type: integer
 *               prix_promotion:
 *                 type: integer
 *               is_promotion:
 *                 type: boolean
 *               pourcentage_reduction:
 *                 type: integer
 *               made_in_gabon:
 *                 type: boolean
 *               categorie_id:
 *                 type: string
 *                 format: uuid
 *               image_principale:
 *                 type: string
 *     responses:
 *       200:
 *         description: Article mis à jour
 *       400:
 *         description: Données invalides ou catégorie inexistante
 *       403:
 *         description: Accès refusé (pas le propriétaire)
 *       404:
 *         description: Article introuvable
 */

const updateSchema = z.object({
    nom: z.string().min(1, "Le nom ne peut pas être vide").optional(),
    description: z.string().optional(),
    prix: z.number().int().nonnegative("Le prix doit être positif").optional(),
    prix_promotion: z.number().int().nonnegative().optional(),
    is_promotion: z.boolean().optional(),
    pourcentage_reduction: z.number().int().min(0).max(100).optional(),
    made_in_gabon: z.boolean().optional(),
    categorie_id: z.string().uuid("L'ID de catégorie doit être un UUID valide").optional(),
    image_principale: z.string().url("L'URL de l'image doit être valide").optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;
        if (!id || typeof id !== "string")
            return res.status(400).json({ error: "ID article manquant" });

        const body = updateSchema.parse(req.body);

        // 1) Vérifier que l'article existe et appartient à l'utilisateur
        const { data: existing, error: findErr } = await supabaseAdmin
            .from("articles")
            .select("*")
            .eq("id", id)
            .single();

        if (findErr || !existing)
            return res.status(404).json({ error: "Article introuvable" });

        if (existing.user_id !== profile.id)
            return res.status(403).json({ error: "Accès refusé. Vous n'êtes pas le propriétaire de cet article." });

        // 2) ✅ VALIDATION : Si categorie_id est fourni, vérifier qu'elle existe
        if (body.categorie_id) {
            const { data: categorie, error: categorieErr } = await supabaseAdmin
                .from("categories")
                .select("id, nom, is_active")
                .eq("id", body.categorie_id)
                .single();

            if (categorieErr || !categorie) {
                return res.status(400).json({
                    error: "Catégorie introuvable",
                    details: "L'ID de catégorie fourni n'existe pas dans la base de données"
                });
            }

            // ✅ Vérifier que la catégorie est active
            if (!categorie.is_active) {
                return res.status(400).json({
                    error: "Catégorie inactive",
                    details: `La catégorie "${categorie.nom}" est actuellement désactivée`
                });
            }
        }

        // 3) Mise à jour de l'article
        const payload = {
            ...body,
            updated_at: new Date().toISOString()
        };

        const { data: updated, error: updateErr } = await supabaseAdmin
            .from("articles")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (updateErr) {
            console.error("Erreur update article:", updateErr);
            return res.status(500).json({ error: "Impossible de mettre à jour l'article" });
        }

        // 4) ✅ Enrichir la réponse avec les infos de catégorie si modifiée
        let responseData = { article: updated };

        if (body.categorie_id && updated.categorie_id) {
            const { data: categorieInfo } = await supabaseAdmin
                .from("categories")
                .select("id, nom, slug")
                .eq("id", updated.categorie_id)
                .single();

            if (categorieInfo) {
                responseData = {
                    article: {
                        ...updated,
                        categorie: categorieInfo
                    }
                };
            }
        }

        return res.status(200).json(responseData);

    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/articles/update:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}