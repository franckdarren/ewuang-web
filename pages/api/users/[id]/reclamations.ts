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

        // 🔒 Vérification du paramètre id
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Paramètre id invalide" });
        }

        // 🔒 Vérification que le user connecté correspond bien au paramètre
        if (id !== authenticatedUserId) {
            return res.status(403).json({
                error: "Vous n'êtes pas autorisé à accéder à ces données"
            });
        }

        // 🔍 Récupération des réclamations
        const { data: reclamations, error } = await supabaseAdmin
            .from("reclamations")
            .select("*")
            .eq("user_id", authenticatedUserId);

        if (error) {
            console.error("Erreur Supabase :", error);
            return res.status(500).json({
                error: "Erreur lors de la récupération des réclamations"
            });
        }

        // Si aucune livraison trouvée
        if (!reclamations || reclamations.length === 0) {
            return res.status(404).json({ error: "Aucune réclamation trouvée pour cet utilisateur" });
        }

        // Succès
        return res.status(200).json(reclamations);

    } catch (err: any) {
        console.error("Erreur inattendue :", err);
        return res.status(500).json({
            error: "Erreur interne du serveur",
        });
    }
}
