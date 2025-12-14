import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Envoie une notification (Admin)
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_ids
 *               - type
 *               - titre
 *               - message
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               type:
 *                 type: string
 *               titre:
 *                 type: string
 *               message:
 *                 type: string
 *               lien:
 *                 type: string
 */

const sendSchema = z.object({
    user_ids: z.array(z.string().uuid()).min(1),
    type: z.enum(['commande', 'livraison', 'message', 'promotion', 'alerte_stock', 'avis', 'systeme']),
    titre: z.string().min(1),
    message: z.string().min(1),
    lien: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "admin") {
            return res.status(403).json({ error: "Accès interdit" });
        }

        const body = sendSchema.parse(req.body);

        const notificationsToInsert = body.user_ids.map(user_id => ({
            user_id,
            type: body.type,
            titre: body.titre,
            message: body.message,
            lien: body.lien || null,
            is_read: false,
            created_at: new Date().toISOString(),
        }));

        const { data: notifications, error: insertErr } = await supabaseAdmin
            .from("notifications")
            .insert(notificationsToInsert)
            .select();

        if (insertErr) {
            console.error("Erreur envoi notifications:", insertErr);
            return res.status(500).json({ error: "Impossible d'envoyer les notifications" });
        }

        return res.status(201).json({
            message: `${notifications?.length || 0} notification(s) envoyée(s)`,
            count: notifications?.length || 0
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/notifications/send:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}