import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { getMessagingSafe } from "../../../../app/lib/firebaseAdmin";

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

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
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès interdit" });
        }

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

        const messaging = getMessagingSafe();
        if (!messaging) {
            return res.status(200).json({ push_count: 0, message: "Firebase non configuré — push ignoré" });
        }

        const { data: userData } = await supabaseAdmin
            .from("users")
            .select("fcm_token")
            .eq("id", notif.user_id)
            .not("fcm_token", "is", null)
            .single();

        const token = (userData as Record<string, unknown> | null)?.fcm_token as string | null;
        if (!token) {
            return res.status(200).json({ push_count: 0, message: "Aucun token FCM disponible pour cet utilisateur" });
        }

        let pushCount = 0;
        try {
            for (const batch of chunk([token], 500)) {
                await messaging.sendEachForMulticast({
                    tokens: batch,
                    notification: { title: notif.titre as string, body: notif.message as string },
                    data: {
                        type: (notif.type as string).toLowerCase(),
                        route: (notif.lien as string | null) || "/",
                    },
                    android: {
                        priority: "high",
                        notification: { channelId: "commandes", sound: "default", priority: "max" },
                    },
                    apns: { payload: { aps: { sound: "default", badge: 1 } } },
                });
                pushCount += batch.length;
            }
        } catch (err) {
            console.error("[notifications/resend] échec push FCM:", err);
        }

        return res.status(200).json({
            push_count: pushCount,
            message: pushCount > 0 ? "Push renvoyé avec succès" : "Échec du push FCM",
        });
    } catch (err) {
        console.error("Error /api/notifications/[id]/resend:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
