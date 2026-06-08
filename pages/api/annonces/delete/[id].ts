// pages/api/annonces/delete/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/annonces/delete/{id}:
 *   delete:
 *     summary: Supprime une publicité
 *     description: Un non-administrateur ne peut supprimer que ses propres publicités.
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
 *         description: Publicité supprimée
 *       403:
 *         description: Accès interdit
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

        // Vérifier l'appartenance avant la suppression
        const isAdmin = auth.profile.role === "Administrateur";
        if (!isAdmin) {
            const { data: existing } = await supabaseAdmin
                .from("publicites")
                .select("user_id")
                .eq("id", id)
                .single();

            if (!existing) return res.status(404).json({ error: "Publicité introuvable" });
            if (existing.user_id !== auth.authUser.id) {
                return res.status(403).json({ error: "Accès interdit" });
            }
        }

        const { data, error } = await supabaseAdmin
            .from("publicites")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.error("Supabase delete error:", error);
            return res.status(500).json({ error: "Impossible de supprimer la publicité" });
        }

        return res.status(200).json({ message: "Supprimée avec succès", deleted: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
