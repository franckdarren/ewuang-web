import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { getMessagingSafe } from "../../../app/lib/firebaseAdmin";

// Découpe un tableau en lots de taille fixe (limite FCM = 500 tokens / appel,
// et limite raisonnable pour les filtres PostgREST `.in()`).
function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/**
 * Envoie une push FCM (app fermée / arrière-plan) à une liste d'user_ids.
 * Best-effort : récupère les fcm_token, ignore les destinataires sans token,
 * et n'interrompt jamais le flux principal en cas d'échec. Retourne le nombre
 * de tokens effectivement ciblés.
 */
async function envoyerPush(
    userIds: string[],
    notif: { type: string; titre: string; message: string; lien?: string | null },
): Promise<number> {
    try {
        // Récupère les tokens par lots (évite de dépasser la longueur d'URL
        // PostgREST quand on cible des milliers d'utilisateurs « en groupe »).
        const tokens: string[] = [];
        for (const ids of chunk(userIds, 500)) {
            const { data } = await supabaseAdmin
                .from("users")
                .select("fcm_token")
                .in("id", ids)
                .not("fcm_token", "is", null);
            for (const row of data ?? []) {
                if (row.fcm_token) tokens.push(row.fcm_token as string);
            }
        }

        if (tokens.length === 0) return 0;

        // Firebase non configuré → on ignore le push (l'in-app est déjà persistée).
        const messaging = getMessagingSafe();
        if (!messaging) return 0;

        for (const batch of chunk(tokens, 500)) {
            await messaging.sendEachForMulticast({
                tokens: batch,
                notification: { title: notif.titre, body: notif.message },
                data: {
                    type: notif.type,
                    route: notif.lien || "/",
                },
                android: {
                    priority: "high",
                    notification: { channelId: "commandes", sound: "default", priority: "max" },
                },
                apns: { payload: { aps: { sound: "default", badge: 1 } } },
            });
        }
        return tokens.length;
    } catch (err) {
        console.error("[notifications/send] échec push FCM:", err);
        return 0;
    }
}

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

        if (profile.role !== "Administrateur") {
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

        // Push FCM (best-effort) : l'in-app est déjà persistée, un échec push
        // ne doit pas faire échouer la requête.
        const pushCount = await envoyerPush(body.user_ids, {
            type: body.type,
            titre: body.titre,
            message: body.message,
            lien: body.lien,
        });

        return res.status(201).json({
            message: `${notifications?.length || 0} notification(s) envoyée(s)`,
            count: notifications?.length || 0,
            push_count: pushCount,
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