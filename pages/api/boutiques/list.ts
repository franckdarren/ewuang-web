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
        // 1️⃣ Un compte gérant actif (boutique_membres.role_membre = 'gerant') a lui-même
        // une ligne dans public.users avec role = 'Boutique' : sans ce filtre, il apparaît
        // comme une boutique à part entière en plus de la boutique du propriétaire.
        // On ne filtre que sur les gérants confirmés : les boutiques qui n'ont jamais utilisé
        // la fonctionnalité "inviter un gérant" n'ont aucune ligne dans boutique_membres et
        // doivent rester visibles.
        const { data: gerantRows, error: gerantError } = await supabaseAdmin
            .from("boutique_membres")
            .select("user_id")
            .eq("role_membre", "gerant")
            .eq("statut", "active");

        if (gerantError) return res.status(500).json({ error: gerantError.message });

        const gerantIds = (gerantRows ?? [])
            .map((r) => r.user_id)
            .filter((id): id is string => !!id);

        let usersQuery = supabaseAdmin.from("users").select("*").eq("role", "Boutique");
        if (gerantIds.length > 0) {
            usersQuery = usersQuery.not("id", "in", `(${gerantIds.join(",")})`);
        }

        const { data: users, error } = await usersQuery;

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
