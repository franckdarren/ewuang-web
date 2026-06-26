import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/update-fcm-token:
 *   patch:
 *     summary: Enregistre ou met à jour le token FCM de l'appareil
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcm_token
 *             properties:
 *               fcm_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token FCM mis à jour
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const schema = z.object({
    fcm_token: z.string().min(1),
    platform: z.enum(["android", "ios", "web"]).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { fcm_token, platform } = schema.parse(req.body);

        // 1. Repli legacy : on garde users.fcm_token à jour (rétrocompat).
        const { error } = await supabaseAdmin
            .from("users")
            .update({ fcm_token })
            .eq("id", profile.id);

        if (error) {
            console.error("Erreur update fcm_token:", error);
            return res.status(500).json({ error: "Impossible de mettre à jour le token FCM" });
        }

        // 2. Multi-device : upsert dans device_tokens. ON CONFLICT (token) →
        //    réattribue le token au user courant (cas déconnexion/reconnexion
        //    sur le même appareil). Best-effort : si la table n'existe pas encore
        //    (migration non appliquée), on n'échoue pas la requête.
        try {
            await supabaseAdmin
                .from("device_tokens")
                .upsert(
                    {
                        user_id: profile.id,
                        token: fcm_token,
                        platform: platform ?? null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "token" },
                );
        } catch (e) {
            console.error("[update-fcm-token] device_tokens upsert ignoré:", e);
        }

        return res.status(200).json({ message: "Token FCM mis à jour" });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({ error: "fcm_token invalide" });
        }
        console.error("Error /api/users/update-fcm-token:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
