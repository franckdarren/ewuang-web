// pages/api/auth/resend-verification.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Renvoie l'email de vérification
 *     description: >
 *       Renvoie un email de vérification à l'utilisateur.
 *       Utile si l'email initial n'a pas été reçu.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de vérification renvoyé
 *       400:
 *         description: Email invalide
 *       500:
 *         description: Erreur serveur
 */

const resendVerificationSchema = z.object({
    email: z.string().email("Email invalide"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const body = resendVerificationSchema.parse(req.body);

        // Renvoyer l'email de vérification
        const { error } = await supabaseAdmin.auth.resend({
            type: "signup",
            email: body.email,
        });

        if (error) {
            console.error("Supabase auth error:", error);
            // Ne pas révéler si l'email existe (sécurité)
            return res.status(200).json({
                message: "Si un compte existe avec cet email, un nouvel email de vérification a été envoyé",
            });
        }

        return res.status(200).json({
            message: "Email de vérification renvoyé avec succès",
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
        console.error("Error /api/auth/resend-verification:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}