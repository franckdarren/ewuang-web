// pages/api/articles/category/[category].ts
// Exemple : api/articles/category/pantalons

import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/category/{category}:
 *   get:
 *     summary: Liste les articles par catégorie
 *     description: Récupère les articles filtrés par `categorie`.
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: category
 *         schema:
 *           type: string
 *         required: true
 *         description: Nom de la catégorie
 */
const paramSchema = z.object({
    category: z.string().min(1, "La catégorie est obligatoire")
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // ⚠️ On lit bien req.query.category (et non req.query)
        const { category } = paramSchema.parse(req.query);

        const { data, error } = await supabaseAdmin
            .from("articles")
            .select("*, variations(*), image_articles(*)")
            .eq("categorie", category)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase category error:", error);
            return res.status(500).json({
                error: "Impossible de récupérer les articles pour cette catégorie"
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                message: `Aucun article trouvé pour la catégorie '${category}'.`
            });
        }

        return res.status(200).json(data);
    } catch (err) {
        if (err instanceof ZodError)
            return res.status(400).json({ errors: err.issues });

        console.error("Error /api/articles/category:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
