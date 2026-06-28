import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

/**
 * @swagger
 * /api/zones-livraison/delete/{id}:
 *   delete:
 *     summary: Supprime une zone de livraison (admin)
 *     description: Refuse de supprimer la zone marquée is_default.
 *     tags:
 *       - Zones de livraison
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Zone supprimée }
 *       400: { description: Suppression refusée (zone par défaut) }
 *       403: { description: Réservé aux administrateurs }
 *       404: { description: Zone introuvable }
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requirePermission(req, res, "zones_livraison.delete");
        if (!auth) return;

        const { id } = req.query;
        if (typeof id !== "string") {
            return res.status(400).json({ error: "Identifiant invalide" });
        }

        const { data: existing } = await supabaseAdmin
            .from("zones_livraison")
            .select("id, is_default")
            .eq("id", id)
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ error: "Zone introuvable" });
        }

        if (existing.is_default) {
            return res.status(400).json({
                error: "Impossible de supprimer la zone par défaut. Définissez d'abord une autre zone par défaut.",
            });
        }

        const { error: deleteErr } = await supabaseAdmin
            .from("zones_livraison")
            .delete()
            .eq("id", id);

        if (deleteErr) {
            console.error("Erreur suppression zone:", deleteErr);
            return res.status(500).json({ error: "Impossible de supprimer la zone" });
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error /api/zones-livraison/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
