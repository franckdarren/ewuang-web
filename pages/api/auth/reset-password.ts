// pages/api/auth/reset-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialise le mot de passe
 *     description: >
 *       Réinitialise le mot de passe avec le token reçu par email.
 *       L'utilisateur doit avoir cliqué sur le lien dans l'email.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - access_token
 *               - new_password
 *             properties:
 *               access_token:
 *                 type: string
 *                 description: Token reçu depuis l'email
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *                 description: Nouveau mot de passe
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Données invalides ou token expiré
 *       500:
 *         description: Erreur serveur
 */

const resetPasswordSchema = z.object({
    access_token: z.string().min(1),
    new_password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const body = resetPasswordSchema.parse(req.body);

        // Vérifier le token et obtenir l'utilisateur
        const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(
            body.access_token
        );

        if (getUserError || !user) {
            return res.status(400).json({
                error: "Token invalide ou expiré"
            });
        }

        // Mettre à jour le mot de passe
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: body.new_password }
        );

        if (updateError) {
            console.error("Supabase auth error:", updateError);
            return res.status(500).json({
                error: "Impossible de réinitialiser le mot de passe"
            });
        }

        return res.status(200).json({
            message: "Mot de passe réinitialisé avec succès",
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
        console.error("Error /api/auth/reset-password:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}