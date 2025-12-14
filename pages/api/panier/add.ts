import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/panier/add:
 *   post:
 *     summary: Ajoute un article au panier
 *     tags:
 *       - Panier
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
 *               - quantite
 *             properties:
 *               article_id:
 *                 type: string
 *               variation_id:
 *                 type: string
 *               quantite:
 *                 type: integer
 */

const addSchema = z.object({
    article_id: z.string().uuid(),
    variation_id: z.string().uuid().optional(),
    quantite: z.number().int().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = addSchema.parse(req.body);

        // Vérifier l'article
        const { data: article, error: articleErr } = await supabaseAdmin
            .from("articles")
            .select("*")
            .eq("id", body.article_id)
            .single();

        if (articleErr || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        if (!article.is_active) {
            return res.status(400).json({ error: "Cet article n'est plus disponible" });
        }

        // Vérifier le stock
        let stockDisponible = 0;
        if (body.variation_id) {
            const { data: variation } = await supabaseAdmin
                .from("variations")
                .select("stock")
                .eq("id", body.variation_id)
                .single();

            if (!variation) {
                return res.status(404).json({ error: "Variation introuvable" });
            }

            stockDisponible = variation.stock;
        } else {
            const { data: variations } = await supabaseAdmin
                .from("variations")
                .select("stock")
                .eq("article_id", body.article_id);

            stockDisponible = variations?.reduce((sum, v) => sum + v.stock, 0) || 0;
        }

        if (body.quantite > stockDisponible) {
            return res.status(400).json({
                error: `Stock insuffisant. Disponible: ${stockDisponible}`
            });
        }

        // Récupérer ou créer le panier
        let { data: panier } = await supabaseAdmin
            .from("paniers")
            .select("id")
            .eq("user_id", profile.id)
            .single();

        if (!panier) {
            const { data: newPanier } = await supabaseAdmin
                .from("paniers")
                .insert({
                    user_id: profile.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            panier = newPanier;
        }

        // Vérifier si l'item existe déjà
        const { data: existingItem } = await supabaseAdmin
            .from("panier_items")
            .select("*")
            .eq("panier_id", panier!.id)
            .eq("article_id", body.article_id)
            .eq("variation_id", body.variation_id || null)
            .maybeSingle();

        if (existingItem) {
            const nouvelleQuantite = existingItem.quantite + body.quantite;

            if (nouvelleQuantite > stockDisponible) {
                return res.status(400).json({
                    error: `Stock insuffisant. Maximum: ${stockDisponible}`
                });
            }

            const { data: updatedItem, error: updateErr } = await supabaseAdmin
                .from("panier_items")
                .update({
                    quantite: nouvelleQuantite,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingItem.id)
                .select()
                .single();

            if (updateErr) {
                console.error("Erreur mise à jour item:", updateErr);
                return res.status(500).json({ error: "Erreur lors de la mise à jour" });
            }

            return res.status(200).json({ item: updatedItem });
        }

        // Créer nouvel item
        const { data: newItem, error: insertErr } = await supabaseAdmin
            .from("panier_items")
            .insert({
                panier_id: panier!.id,
                article_id: body.article_id,
                variation_id: body.variation_id || null,
                quantite: body.quantite,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertErr) {
            console.error("Erreur ajout item:", insertErr);
            return res.status(500).json({ error: "Impossible d'ajouter l'article" });
        }

        return res.status(201).json({ item: newItem });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/panier/add:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}