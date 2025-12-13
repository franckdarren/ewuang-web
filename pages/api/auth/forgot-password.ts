// pages/api/auth/forgot-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demande de réinitialisation de mot de passe
 *     description: >
 *       Envoie un email de réinitialisation de mot de passe à l'utilisateur.
 *       Utilise Supabase Auth pour gérer l'envoi d'email.
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
 *         description: Email de réinitialisation envoyé
 *       400:
 *         description: Email invalide
 *       500:
 *         description: Erreur serveur
 */

const forgotPasswordSchema = z.object({
    email: z.string().email("Email invalide"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const body = forgotPasswordSchema.parse(req.body);

        // Utiliser Supabase Auth pour envoyer l'email de réinitialisation
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(body.email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
        });

        if (error) {
            console.error("Supabase auth error:", error);
            // Ne pas révéler si l'email existe ou non (sécurité)
            return res.status(200).json({
                message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé",
            });
        }

        return res.status(200).json({
            message: "Email de réinitialisation envoyé avec succès",
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
        console.error("Error /api/auth/forgot-password:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}