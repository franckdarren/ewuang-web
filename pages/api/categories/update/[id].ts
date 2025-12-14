import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Met à jour une catégorie
 *     tags:
 *       - Catégories
 *     security:
 *       - bearerAuth: []
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    
    if (!auth) return;

    const { profile } = auth;

    if (profile.role !== "Administrateur") {
        return res.status(403).json({ error: "Accès interdit" });
    }

    const { id } = req.query;

    try {
        const updateData: any = {};

        if (req.body.nom) {
            updateData.nom = req.body.nom.trim();
            updateData.slug = req.body.nom
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        }

        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.image !== undefined) updateData.image = req.body.image;
        if (req.body.parent_id !== undefined) updateData.parent_id = req.body.parent_id;
        if (req.body.ordre !== undefined) updateData.ordre = req.body.ordre;
        if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

        updateData.updated_at = new Date().toISOString();

        const { data: category, error } = await supabaseAdmin
            .from("categories")
            .update(updateData)
            .eq("id", id as string)
            .select()
            .single();

        if (error) {
            console.error("Update error:", error);
            return res.status(500).json({ error: "Erreur lors de la mise à jour" });
        }

        return res.status(200).json({ category });
    } catch (err) {
        console.error("PATCH category error:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
