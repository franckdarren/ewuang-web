// pages/api/annonces/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/annonces/list:
 *   get:
 *     summary: Liste les publicités
 *     description: >
 *       Administrateur : retourne toutes les publicités.
 *       Autres rôles : retourne uniquement les publicités de l'utilisateur connecté.
 *     tags:
 *       - Publicites
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const isAdmin = auth.profile.role === "Administrateur";

        const baseQuery = supabaseAdmin
            .from("publicites")
            .select("*")
            .order("created_at", { ascending: false });

        const { data, error } = await (
            isAdmin ? baseQuery : baseQuery.eq("user_id", auth.authUser.id)
        );

        if (error) {
            console.error("Supabase publicites error:", JSON.stringify(error));
            return res.status(500).json({ error: "Impossible de charger les publicités", detail: error.message });
        }

        return res.status(200).json({ publicites: data });
    } catch (e) {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
