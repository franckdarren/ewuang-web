import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/list:
 *   get:
 *     summary: Liste les notifications de l'utilisateur
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: boolean
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from("notifications")
            .select("*", { count: 'exact' })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (req.query.type) {
            query = query.eq("type", req.query.type as string);
        }

        if (req.query.is_read !== undefined) {
            query = query.eq("is_read", req.query.is_read === 'true');
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            console.error("Erreur récupération notifications:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        return res.status(200).json({
            notifications,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (err) {
        console.error("Error /api/notifications/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}