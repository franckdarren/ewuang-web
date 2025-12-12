// pages/api/variations/update/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/variations/update/{id}:
 *   patch:
 *     summary: Met à jour une variation
 *     description: >
 *       Modifie les informations d'une variation.
 *       Seul le propriétaire de l'article ou un admin peut modifier.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               couleur:
 *                 type: string
 *                 maxLength: 255
 *               taille:
 *                 type: string
 *                 maxLength: 255
 *               stock:
 *                 type: integer
 *               prix:
 *                 type: integer
 *               image:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Variation mise à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Variation introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateVariationSchema = z.object({
    couleur: z.string().max(255).optional(),
    taille: z.string().max(255).optional(),
    stock: z.number().int().nonnegative().optional(),
    prix: z.number().int().nonnegative().optional(),
    image: z.string().max(255).optional(),
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
            return res.status(400).json({ error: "ID de variation invalide" });
        }

        const body = updateVariationSchema.parse(req.body);

        // Vérifier qu'au moins un champ est fourni
        if (Object.keys(body).length === 0) {
            return res.status(400).json({
                error: "Au moins un champ doit être fourni pour la mise à jour",
            });
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
                error: "Vous ne pouvez modifier que vos propres variations",
            });
        }

        // Construire l'objet de mise à jour
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (body.couleur !== undefined) updateData.couleur = body.couleur;
        if (body.taille !== undefined) updateData.taille = body.taille;
        if (body.stock !== undefined) updateData.stock = body.stock;
        if (body.prix !== undefined) updateData.prix = body.prix;
        if (body.image !== undefined) updateData.image = body.image;

        // Mettre à jour la variation
        const { data: updatedVariation, error: updateError } = await supabaseAdmin
            .from("variations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Impossible de mettre à jour la variation" });
        }

        // Si le stock est modifié, mettre à jour aussi la table stocks
        if (body.stock !== undefined) {
            // Vérifier si un enregistrement stock existe
            const { data: existingStock } = await supabaseAdmin
                .from("stocks")
                .select("id")
                .eq("variation_id", id)
                .single();

            if (existingStock) {
                // Mettre à jour
                await supabaseAdmin
                    .from("stocks")
                    .update({
                        quantite: body.stock,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("variation_id", id);
            } else {
                // Créer
                await supabaseAdmin.from("stocks").insert({
                    variation_id: id,
                    quantite: body.stock,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            }
        }

        return res.status(200).json({
            message: "Variation mise à jour avec succès",
            variation: updatedVariation,
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
        console.error("Error /api/variations/update/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}