import type { NextApiRequest, NextApiResponse } from "next";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import { getSupabaseAdmin } from "../../../../app/lib/supabaseSafeAdmin";

/**
 * @swagger
 * /api/boutiques/membres:
 *   get:
 *     tags: ["Boutique Membres"]
 *     summary: "Liste les membres (proprio + gérants) de la boutique de l'appelant"
 *     description: >
 *       Retourne tous les memberships (pending, active, revoked) liés à la boutique
 *       de l'utilisateur authentifié. Inclut le user lié si l'invitation a été acceptée.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "Liste des membres" }
 *       403: { description: "Rôle Boutique requis" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        const supabaseAdmin = getSupabaseAdmin();

        // On exclut volontairement `invite_token` du select : il doit rester
        // confidentiel et n'a jamais besoin d'être renvoyé au client.
        const { data: membres, error } = await supabaseAdmin
            .from("boutique_membres")
            .select(
                "id, boutique_id, user_id, email, role_membre, statut, expires_at, invited_by, invited_at, joined_at, revoked_at",
            )
            .eq("boutique_id", access.boutiqueId)
            .order("role_membre", { ascending: false }) // 'proprio' > 'gerant' alpha → DESC place le proprio en premier
            .order("invited_at", { ascending: true });

        if (error) {
            console.error("[membres list] error:", error);
            return res.status(500).json({ error: "Impossible de récupérer les membres" });
        }

        // Hydratation user_id → profil minimal (en 1 round-trip groupé)
        const userIds = (membres ?? [])
            .map(m => m.user_id)
            .filter((id): id is string => !!id);

        let usersById: Record<string, { id: string; name: string; owner_name: string | null; email: string; url_logo: string | null }> = {};
        if (userIds.length > 0) {
            const { data: users } = await supabaseAdmin
                .from("users")
                .select("id, name, owner_name, email, url_logo")
                .in("id", userIds);
            usersById = Object.fromEntries((users ?? []).map(u => [u.id, u]));
        }

        const enriched = (membres ?? []).map(m => ({
            ...m,
            user: m.user_id ? usersById[m.user_id] ?? null : null,
        }));

        return res.status(200).json({
            membres: enriched,
            current: {
                membre_id: access.membreId,
                role_membre: access.roleMembre,
                is_proprio: access.isProprio,
            },
        });
    } catch (err) {
        console.error("[membres list] error:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
