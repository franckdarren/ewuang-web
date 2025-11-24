import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}/reclamations:
 *   get:
 *     summary: Récupère les réclamations déposées par un utilisateur
 *     description: Cette route renvoie toutes les réclamations que l'utilisateur a déposées, qu'elles concernent des commandes, des livraisons ou des produits.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'utilisateur (auth_id)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des réclamations de l'utilisateur
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Aucune réclamation trouvée
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { id } = req.query;

    try {
        const { data, error } = await supabaseAdmin
            .from("reclamations")
            .select("*")
            .eq("user_id", id);

        if (error) return res.status(500).json({ error: error.message });

        res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
}
