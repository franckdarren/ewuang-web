import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/boutiques/public/{slug}:
 *   get:
 *     summary: Récupère les informations publiques d'une boutique via son slug
 *     description: >
 *       Endpoint public (anonyme, sans Bearer) utilisé par la page de partage
 *       `/b/{slug}` et par l'app Flutter pour résoudre un lien de boutique.
 *       Ne renvoie que des champs publics (pas d'email, téléphone ou solde).
 *     tags: [Boutiques]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Boutique trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Boutique introuvable
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const { slug } = req.query;
    if (typeof slug !== "string" || !slug) {
        return res.status(400).json({ error: "Slug invalide" });
    }

    try {
        const { data: boutique, error } = await supabaseAdmin
            .from("users")
            .select(
                "id, slug, name, url_logo, description, address, heure_ouverture, heure_fermeture, is_certified"
            )
            .eq("slug", slug)
            .eq("role", "Boutique")
            .eq("is_active", true)
            .maybeSingle();

        if (error) return res.status(500).json({ error: error.message });
        if (!boutique) return res.status(404).json({ error: "Boutique introuvable" });

        return res.status(200).json(boutique);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
