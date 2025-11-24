import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/list:
 *   get:
 *     summary: Liste tous les utilisateurs avec leurs détails auth + public
 *     description: >
 *       Récupère la liste de tous les utilisateurs avec leurs détails dans la table `public.users`. La route est sécurisée et nécessite un token Bearer valide.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    try {
        // 1️⃣ Récupère tous les users de public.users
        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*");

        if (error) return res.status(500).json({ error: error.message });

        // 2️⃣ Pour chaque utilisateur, récupère auth.users
        const usersWithAuth = await Promise.all(users.map(async (user) => {
            let authUser = null;
            if (user.auth_id) {
                const { data, error } = await supabaseAdmin.auth.admin.getUserById(user.auth_id);
                if (!error) authUser = data.user;
            }
            return { ...user, authUser };
        }));

        res.status(200).json(usersWithAuth);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
}
