import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { envoyerPushFCM } from "../../../app/lib/sendPushFCM";

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

// L'enum Postgres `notification_type` stocke des libellés français capitalisés
// avec accents ('Système', 'Alerte stock', …). Le runtime passe par PostgREST,
// donc le `@map` du schéma Prisma n'est PAS appliqué : il faut insérer la valeur
// littérale de l'enum, sinon Postgres rejette l'insert (22P02). L'API publique
// reste en minuscules (ce qu'envoient le dashboard et l'app Flutter).
const DB_NOTIFICATION_TYPE: Record<z.infer<typeof sendSchema>["type"], string> = {
    commande: 'Commande',
    livraison: 'Livraison',
    message: 'Message',
    promotion: 'Promotion',
    alerte_stock: 'Alerte stock',
    avis: 'Avis',
    systeme: 'Système',
};

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
            type: DB_NOTIFICATION_TYPE[body.type],
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
        const pushCount = await envoyerPushFCM(body.user_ids, {
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