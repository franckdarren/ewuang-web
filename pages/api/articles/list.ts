// pages/api/articles/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/articles/list:
 *   get:
 *     summary: Liste tous les articles (pagination)
 *     description: |
 *       Retourne la liste des articles, triés par date (nouveaux en premier).
 *       Query params acceptés :
 *         - page : numéro de la page (défaut : 1)
 *         - perPage : nombre d’articles par page (défaut : 20)
 *         - q : recherche par nom (optionnel)
 *     tags:
 *       - Articles
 */

const querySchema = z.object({
    page: z.string().optional(),
    perPage: z.string().optional(),
    q: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const query = querySchema.parse(req.query);
        const page = query.page ? Math.max(1, parseInt(query.page)) : 1;
        const perPage = query.perPage ? Math.min(100, parseInt(query.perPage)) : 20;
        const offset = (page - 1) * perPage;

        // Construction de la requête
        let sbQuery = supabaseAdmin
            .from("articles")
            .select(`
        *,
        variations(*),
        image_articles(*),
        users!user_id(id, name),
        categories!categorie_id(id, nom)
        `)
            .order("created_at", { ascending: false })
            .range(offset, offset + perPage - 1);

        if (query.q) {
            // Recherche par nom (LIKE simple)
            sbQuery = sbQuery.ilike("nom", `%${query.q}%`);
        }

        const { data: articles, error } = await sbQuery;

        if (error) {
            console.error("Supabase list articles error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les articles" });
        }

        // Mapping pour que le frontend ait tout propre
        const mappedArticles = articles?.map((article: any) => ({
            ...article,
            vendeur: article.users || null,
            categorie: article.categories || null,
            variations: article.variations || [],
            image_articles: article.image_articles || [],
        }));

        return res.status(200).json({
            page,
            perPage,
            articles: mappedArticles ?? [],
        });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/articles/list:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
