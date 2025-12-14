import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/panier/update/{item_id}:
 *   patch:
 *     summary: Met à jour la quantité d'un item
 *     tags:
 *       - Panier
 *     security:
 *       - bearerAuth: []
 */

const updateSchema = z.object({
    quantite: z.number().int().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const { item_id } = req.query;

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = updateSchema.parse(req.body);

        // Vérifier l'item et qu'il appartient à l'utilisateur
        const { data: item, error: itemErr } = await supabaseAdmin
            .from("panier_items")
            .select(`
        *,
        paniers!inner(user_id),
        articles(*),
        variations(stock)
      `)
            .eq("id", item_id as string)
            .eq("paniers.user_id", profile.id)
            .single();

        if (itemErr || !item) {
            return res.status(404).json({ error: "Item introuvable" });
        }

        // Vérifier le stock
        let stockDisponible = 0;
        if (item.variation_id) {
            stockDisponible = item.variations?.stock || 0;
        } else {
            const { data: variations } = await supabaseAdmin
                .from("variations")
                .select("stock")
                .eq("article_id", item.article_id);

            stockDisponible = variations?.reduce((sum, v) => sum + v.stock, 0) || 0;
        }

        if (body.quantite > stockDisponible) {
            return res.status(400).json({
                error: `Stock insuffisant. Disponible: ${stockDisponible}`
            });
        }

        // Mise à jour
        const { data: updatedItem, error: updateErr } = await supabaseAdmin
            .from("panier_items")
            .update({
                quantite: body.quantite,
                updated_at: new Date().toISOString(),
            })
            .eq("id", item_id as string)
            .select()
            .single();

        if (updateErr) {
            console.error("Erreur mise à jour:", updateErr);
            return res.status(500).json({ error: "Erreur lors de la mise à jour" });
        }

        return res.status(200).json({ item: updatedItem });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/panier/update/[item_id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}