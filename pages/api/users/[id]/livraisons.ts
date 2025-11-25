import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}/livraisons:
 *   get:
 *     summary: Récupère les livraisons de l'utilisateur
 *     description: >
 *       Récupère les livraisons associées à un utilisateur spécifique dans la table `livraisons`. La route est sécurisée et nécessite un token Bearer valide.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (auth_id)
 *     responses:
 *       200:
 *         description: Liste des livraisons
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Utilisateur ou livraisons non trouvées
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { data: livraisons } = await supabaseAdmin
        .from("livraisons")
        .select("*")
        .eq("user_id", auth.user.id);
    res.status(200).json(livraisons);
}
