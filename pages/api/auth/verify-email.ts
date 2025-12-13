// pages/api/auth/verify-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Vérifie l'email avec le token
 *     description: >
 *       Vérifie l'email de l'utilisateur avec le token reçu par email.
 *       Appelé automatiquement quand l'utilisateur clique sur le lien.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - type
 *             properties:
 *               token:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [signup, email_change]
 *     responses:
 *       200:
 *         description: Email vérifié avec succès
 *       400:
 *         description: Token invalide
 *       500:
 *         description: Erreur serveur
 */

const verifyEmailSchema = z.object({
    token: z.string().min(1),
    type: z.enum(["signup", "email_change"]),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const body = verifyEmailSchema.parse(req.body);

        // Vérifier le token
        const { data, error } = await supabaseAdmin.auth.verifyOtp({
            token_hash: body.token,
            type: body.type,
        });

        if (error) {
            console.error("Supabase auth error:", error);
            return res.status(400).json({
                error: "Token invalide ou expiré"
            });
        }

        return res.status(200).json({
            message: "Email vérifié avec succès",
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
        console.error("Error /api/auth/verify-email:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}