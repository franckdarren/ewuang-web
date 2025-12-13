// pages/api/auth/change-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     summary: Change le mot de passe
 *     description: >
 *       Permet à un utilisateur connecté de changer son mot de passe.
 *       Nécessite l'ancien mot de passe pour validation.
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *       400:
 *         description: Données invalides ou ancien mot de passe incorrect
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const changePasswordSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { authUser } = auth;

        const body = changePasswordSchema.parse(req.body);

        // Vérifier l'ancien mot de passe en essayant de se connecter
        const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: authUser.email!,
            password: body.current_password,
        });

        if (signInError) {
            return res.status(400).json({
                error: "Mot de passe actuel incorrect"
            });
        }

        // Mettre à jour le mot de passe
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password: body.new_password }
        );

        if (updateError) {
            console.error("Supabase auth error:", updateError);
            return res.status(500).json({
                error: "Impossible de changer le mot de passe"
            });
        }

        return res.status(200).json({
            message: "Mot de passe changé avec succès",
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
        console.error("Error /api/auth/change-password:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}