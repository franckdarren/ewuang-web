import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";
import { envoyerPushFCM } from "../../../../app/lib/sendPushFCM";

/**
 * @swagger
 * /api/notifications/{id}/resend:
 *   post:
 *     summary: Renvoie le push FCM d'une notification (Admin)
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
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "notifications.write");
        if (!auth) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Identifiant invalide" });
        }

        const { data: notif, error: fetchErr } = await supabaseAdmin
            .from("notifications")
            .select("id, user_id, type, titre, message, lien")
            .eq("id", id)
            .single();

        if (fetchErr || !notif) {
            return res.status(404).json({ error: "Notification introuvable" });
        }

        // Push sur tous les appareils du destinataire (multi-device + purge
        // tokens morts via le helper).
        const pushCount = await envoyerPushFCM([notif.user_id as string], {
            type: notif.type as string,
            titre: notif.titre as string,
            message: notif.message as string,
            lien: notif.lien as string | null,
        });

        return res.status(200).json({
            push_count: pushCount,
            message: pushCount > 0 ? "Push renvoyé avec succès" : "Aucun token FCM / Firebase non configuré",
        });
    } catch (err) {
        console.error("Error /api/notifications/[id]/resend:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
