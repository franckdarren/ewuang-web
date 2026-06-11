// pages/api/users/livreurs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/livreurs:
 *   get:
 *     summary: Liste tous les livreurs
 *     description: Retourne les utilisateurs avec le rôle Livreur. Accessible aux administrateurs.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des livreurs
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    if (profile.role !== "Administrateur") {
        return res.status(403).json({ error: "Accès refusé" });
    }

    try {
        const { data: livreurs, error } = await supabaseAdmin
            .from("users")
            .select("id, name, email, phone")
            .eq("role", "Livreur")
            .order("name", { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ livreurs: livreurs ?? [] });
    } catch (err) {
        console.error("Error /api/users/livreurs:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
