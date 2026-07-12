import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/boutique/list:
 *   get:
 *     summary: Liste tous les utilisateurs avec rôle Boutique et leurs détails auth + public
 *     description: >
 *       Récupère la liste de tous les utilisateurs dont le rôle est "Boutique", avec leurs détails dans la table `public.users`.
 *       La route est sécurisée et nécessite un token Bearer valide.
 *     tags: [Boutiques]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs avec rôle Boutique
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

    // Auth optionnelle : un invité reçoit les infos publiques uniquement (sans authUser/email)
    const hasBearer = !!req.headers.authorization;
    const auth = hasBearer ? await requireUserAuth(req, res) : null;
    if (hasBearer && !auth) return;

    try {
<<<<<<< HEAD
        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("role", "Boutique");
=======
        // 1️⃣ Récupère les users de public.users avec role = 'Boutique'.
        // On ne garde que les comptes "principaux" (boutique_id IS NULL) : un compte
        // gérant (boutique_id renseigné, pointant vers le compte principal) ne doit
        // pas apparaître comme une boutique distincte dans la liste publique.
        const { data: users, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("role", "Boutique")
            .is("boutique_id", null);
>>>>>>> develop

        if (error) return res.status(500).json({ error: error.message });

        if (!auth) {
            return res.status(200).json(users);
        }

        const usersWithAuth = await Promise.all(
            users.map(async (user) => {
                let authUser = null;
                if (user.auth_id) {
                    const { data, error } = await supabaseAdmin.auth.admin.getUserById(user.auth_id);
                    if (!error) authUser = data.user;
                }
                return { ...user, authUser };
            })
        );

        res.status(200).json(usersWithAuth);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
}
