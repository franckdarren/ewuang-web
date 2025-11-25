import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Récupère les détails d'un utilisateur spécifique
 *     description: >
 *       Récupère les détails d'un utilisateur spécifique dans la table `public.users`. La route est sécurisée et nécessite un token Bearer valide.  
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
 *         description: Détails de l'utilisateur
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // Vérification authentification
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { id } = req.query;
        const authenticatedUserId = auth.profile.id;

        //console.log("param.id:", id);
        //console.log("authenticatedUserId:", authenticatedUserId);
        const { data: user, error: userError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", authenticatedUserId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        let authUser = null;
        if (user.auth_id) {
            const { data, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.auth_id);
            if (!authError && data.user) {
                authUser = data.user;
            }
        }

        return res.status(200).json({ ...user, authUser });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
