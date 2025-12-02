// pages/api/publicites/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/publicites/delete/{id}:
 *   delete:
 *     summary: Supprime une publicité
 *     description: Supprime une publicité par son ID.
 *     tags:
 *       - Publicites
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Publicité supprimée
 *       404:
 *         description: Introuvable
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const { id } = req.query;
        if (typeof id !== "string") return res.status(400).json({ error: "ID invalide" });

        const { data, error } = await supabaseAdmin
            .from("publicites")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.error("Supabase delete error:", error);
            return res.status(404).json({ error: "Publicité introuvable" });
        }

        return res.status(200).json({ message: "Supprimée avec succès", deleted: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
