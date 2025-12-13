// pages/api/auth/refresh-token.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Rafraîchit le token d'accès
 *     description: >
 *       Génère un nouveau token d'accès à partir du refresh token.
 *       Utilisé pour prolonger la session sans reconnexion.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Le refresh token reçu lors de la connexion
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 expires_in:
 *                   type: integer
 *       400:
 *         description: Refresh token invalide
 *       500:
 *         description: Erreur serveur
 */

const refreshTokenSchema = z.object({
    refresh_token: z.string().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const body = refreshTokenSchema.parse(req.body);

        // Rafraîchir le token
        const { data, error } = await supabaseAdmin.auth.refreshSession({
            refresh_token: body.refresh_token,
        });

        if (error || !data.session) {
            console.error("Supabase auth error:", error);
            return res.status(400).json({
                error: "Refresh token invalide ou expiré"
            });
        }

        return res.status(200).json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            user: data.user,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/auth/refresh-token:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}