import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/notifications/admin/list:
 *   get:
 *     summary: Liste toutes les notifications (Admin)
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
 *         name: search
 *         schema:
 *           type: string
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès interdit" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from("notifications")
            .select(
                `id, user_id, type, titre, message, lien, is_read, created_at,
                 users!notifications_user_id_fkey(id, name, owner_name, email, role)`,
                { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (req.query.type) {
            query = query.eq("type", req.query.type as string);
        }

        if (req.query.is_read !== undefined) {
            query = query.eq("is_read", req.query.is_read === "true");
        }

        if (req.query.search) {
            const s = `%${req.query.search}%`;
            query = query.or(`titre.ilike.${s},message.ilike.${s}`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Erreur récupération notifications admin:", error);
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        const DB_TYPE_MAP: Record<string, string> = {
            'Commande': 'commande', 'Livraison': 'livraison', 'Message': 'message',
            'Promotion': 'promotion', 'Alerte stock': 'alerte_stock', 'Avis': 'avis', 'Système': 'systeme',
        };

        const notifications = (data ?? []).map((row: Record<string, unknown>) => {
            const user = row.users as Record<string, unknown> | null;
            return {
                id: row.id,
                user_id: row.user_id,
                type: DB_TYPE_MAP[row.type as string] ?? row.type,
                titre: row.titre,
                message: row.message,
                lien: row.lien,
                is_read: row.is_read,
                created_at: row.created_at,
                user_name: (user?.name ?? user?.owner_name ?? user?.email ?? null) as string | null,
                user_email: (user?.email ?? null) as string | null,
                user_role: (user?.role ?? null) as string | null,
            };
        });

        return res.status(200).json({
            notifications,
            pagination: {
                page,
                limit,
                total: count ?? 0,
                total_pages: Math.ceil((count ?? 0) / limit),
            },
        });
    } catch (err) {
        console.error("Error /api/notifications/admin/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
