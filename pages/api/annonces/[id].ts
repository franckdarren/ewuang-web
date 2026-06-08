// pages/api/annonces/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/annonces/{id}:
 *   get:
 *     summary: Récupère une publicité
 *     description: Récupère une publicité par son ID. Un non-administrateur ne peut accéder qu'à ses propres publicités.
 *     tags:
 *       - Publicites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Publicité trouvée
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Introuvable
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const { id } = req.query;
    if (typeof id !== "string") return res.status(400).json({ error: "ID invalide" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { data, error } = await supabaseAdmin
            .from("publicites")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return res.status(404).json({ error: "Publicité introuvable" });

        const isAdmin = auth.profile.role === "Administrateur";
        if (!isAdmin && data.user_id !== auth.authUser.id) {
            return res.status(403).json({ error: "Accès interdit" });
        }

        return res.status(200).json({ publicite: data });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
