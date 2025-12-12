// pages/api/stocks/update/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/stocks/update/{id}:
 *   patch:
 *     summary: Met à jour le stock d'une variation
 *     description: >
 *       Modifie la quantité en stock d'une variation.
 *       Seul le propriétaire de l'article ou un admin peut modifier.
 *     tags:
 *       - Stocks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du stock (ou variation_id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantite
 *             properties:
 *               quantite:
 *                 type: integer
 *                 minimum: 0
 *                 description: Nouvelle quantité en stock
 *     responses:
 *       200:
 *         description: Stock mis à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Stock introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateStockSchema = z.object({
    quantite: z.number().int().nonnegative(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID invalide" });
        }

        const body = updateStockSchema.parse(req.body);

        // Récupérer la variation et vérifier les permissions
        const { data: variation, error: variationError } = await supabaseAdmin
            .from("variations")
            .select("*, articles!inner (user_id)")
            .eq("id", id)
            .single();

        if (variationError || !variation) {
            return res.status(404).json({ error: "Variation introuvable" });
        }

        // Extraire l'article du tableau
        const article = Array.isArray(variation.articles) ? variation.articles[0] : variation.articles;

        // Vérifier les permissions
        const isOwner = article?.user_id === profile.id;
        const isAdmin = profile.role === "Administrateur";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                error: "Vous ne pouvez modifier que vos propres stocks",
            });
        }

        // Mettre à jour le stock dans la table variations
        await supabaseAdmin
            .from("variations")
            .update({
                stock: body.quantite,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        // Mettre à jour ou créer dans la table stocks
        const { data: existingStock } = await supabaseAdmin
            .from("stocks")
            .select("id")
            .eq("variation_id", id)
            .single();

        if (existingStock) {
            // Mettre à jour
            const { data: updatedStock, error: updateError } = await supabaseAdmin
                .from("stocks")
                .update({
                    quantite: body.quantite,
                    updated_at: new Date().toISOString(),
                })
                .eq("variation_id", id)
                .select()
                .single();

            if (updateError) {
                console.error("Supabase update error:", updateError);
                return res.status(500).json({ error: "Impossible de mettre à jour le stock" });
            }

            return res.status(200).json({
                message: "Stock mis à jour avec succès",
                stock: updatedStock,
            });
        } else {
            // Créer
            const { data: newStock, error: insertError } = await supabaseAdmin
                .from("stocks")
                .insert({
                    variation_id: id,
                    quantite: body.quantite,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) {
                console.error("Supabase insert error:", insertError);
                return res.status(500).json({ error: "Impossible de créer le stock" });
            }

            return res.status(200).json({
                message: "Stock créé avec succès",
                stock: newStock,
            });
        }
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/stocks/update/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}