import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/admin/top-vendeurs:
 *   get:
 *     summary: Top vendeurs (Admin)
 *     description: >
 *       Retourne les meilleurs vendeurs classés par chiffre d'affaires. 
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès interdit" });
        }

        const limit = parseInt(req.query.limit as string) || 10;

        // Récupérer vendeurs avec commandes
        const { data: vendeurs, error } = await supabaseAdmin
            .from("users")
            .select(`
        id,
        name,
        email,
        url_logo,
        articles(id),
        commandes!vendeur_id(prix, statut)
        `)
            .eq("role", "Boutique");

        if (error) {
            console.error("Erreur récupération vendeurs:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        const statsVendeurs = vendeurs?.map(v => ({
            id: v.id,
            name: v.name,
            email: v.email,
            url_logo: v.url_logo,
            nombre_articles: v.articles?.length || 0,
            nombre_commandes: v.commandes?.filter((c: any) => c.statut === 'Livrée').length || 0,
            chiffre_affaires: v.commandes
                ?.filter((c: any) => c.statut === 'Livrée')
                .reduce((sum: number, c: any) => sum + c.prix, 0) || 0
        })) || [];

        statsVendeurs.sort((a, b) => b.chiffre_affaires - a.chiffre_affaires);

        return res.status(200).json({ vendeurs: statsVendeurs.slice(0, limit) });
    } catch (err) {
        console.error("Error /api/analytics/admin/top-vendeurs:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}