import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Récupère une catégorie avec tous ses articles
 *     tags:
 *       - Catégories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { id } = req.query;

  try {
    const { data: category, error } = await supabaseAdmin
      .from("categories")
      .select(`
        id,
        nom,
        slug,
        description,
        image,
        parent_id,
        is_active,
        ordre,
        articles!inner(
          id,
          nom,
          prix,
          image_principale,
          is_active,
          made_in_gabon,
          is_promotion,
          prix_promotion,
          pourcentage_reduction,
          description,
          slug
        )
      `)
      .eq("id", id as string)
      .single();

    if (error || !category) {
      return res.status(404).json({ error: "Catégorie introuvable" });
    }

    return res.status(200).json({ category });
  } catch (err) {
    console.error("GET category with articles error:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
