// pages/api/articles/user/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/user/{id}:
 *   get:
 *     summary: Liste les articles d'un utilisateur
 *     description: Récupère tous les articles publics d'un userisateur spécifique.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     tags: [Articles]
 */
const paramsSchema = z.object({ id: z.string() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });
    try {
        const { id } = paramsSchema.parse(req.query);
        const { data: articles, error } = await supabaseAdmin
            .from("articles")
            .select("*, variations(*), image_articles(*)")
            .eq("user_id", id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase:", error);
            return res.status(500).json({ error: "Impossible de récupérer les articles de l'utilisateur" });
        }
        return res.status(200).json(articles ?? []);
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/articles/user:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
