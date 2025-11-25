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
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // Vérification authentification
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { id } = req.query;
        const authenticatedUserId = auth.profile.auth_id;

        //console.log("param.id:", id);
        //console.log("authenticatedUserId:", authenticatedUserId);

        // Vérifie que user.id existe (sécurité)
        if (!auth.profile?.id) {
            return res.status(400).json({ error: "Utilisateur invalide : ID introuvable" });
        }

        // Récupère les livraisons appartenant au user
        const { data: livraisons, error } = await supabaseAdmin
            .from("livraisons")
            .select("*")
            .eq("user_id", authenticatedUserId);

        if (error) {
            console.error("Erreur Supabase :", error);
            return res.status(500).json({ error: "Impossible de récupérer les livraisons" });
        }

        // Si aucune livraison trouvée
        if (!livraisons || livraisons.length === 0) {
            return res.status(404).json({ error: "Aucune livraison trouvée pour cet utilisateur" });
        }

        // Succès
        return res.status(200).json(livraisons);

    } catch (err) {
        console.error("Erreur route /livraisons :", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}

