import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

const DB_NOTIFICATION_TYPE: Record<string, string> = {
    commande: "Commande",
    livraison: "Livraison",
    message: "Message",
    promotion: "Promotion",
    alerte_stock: "Alerte stock",
    avis: "Avis",
    systeme: "Système",
};

const updateSchema = z.object({
    type: z.enum(["commande", "livraison", "message", "promotion", "alerte_stock", "avis", "systeme"]).optional(),
    titre: z.string().min(1).max(150).optional(),
    message: z.string().min(1).max(500).optional(),
    lien: z.string().nullable().optional(),
});

/**
 * @swagger
 * /api/notifications/{id}/update:
 *   patch:
 *     summary: Modifie une notification (Admin)
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               titre:
 *                 type: string
 *               message:
 *                 type: string
 *               lien:
 *                 type: string
 *                 nullable: true
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "notifications.write");
        if (!auth) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Identifiant invalide" });
        }

        const body = updateSchema.parse(req.body);
        if (Object.keys(body).length === 0) {
            return res.status(400).json({ error: "Aucun champ à mettre à jour" });
        }

        const patch: Record<string, unknown> = {};
        if (body.type !== undefined) patch.type = DB_NOTIFICATION_TYPE[body.type];
        if (body.titre !== undefined) patch.titre = body.titre;
        if (body.message !== undefined) patch.message = body.message;
        if (body.lien !== undefined) patch.lien = body.lien ?? null;

        const { data, error } = await supabaseAdmin
            .from("notifications")
            .update(patch)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({ error: "Notification introuvable" });
            }
            console.error("Erreur mise à jour notification:", error);
            return res.status(500).json({ error: "Erreur lors de la mise à jour" });
        }

        return res.status(200).json({ notification: data });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error /api/notifications/[id]/update:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
