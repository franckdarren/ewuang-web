// pages/api/users/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseAdmin } from "../../../app/lib/supabaseSafeAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Crée un utilisateur (admin)
 *     description: >
 *       Crée un utilisateur dans Supabase Auth + table users.
 *       Accessible uniquement aux administrateurs.
 *       Le compte est créé sans vérification email.
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
 *               - email
 *               - password
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Client, Boutique, Livreur, Administrateur]
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
 *       500:
 *         description: Erreur serveur
 */

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    role: z.enum(["Client", "Boutique", "Livreur", "Administrateur"]),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // Vérifier l'authentification
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Seul un admin peut créer des utilisateurs
        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const body = createUserSchema.parse(req.body);
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Créer l'utilisateur dans Supabase Auth (sans email de vérification)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: true, // Marque l'email comme vérifié directement
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        // 2. Insérer dans la table users
        const { data: userData, error: dbError } = await supabaseAdmin
            .from("users")
            .insert({
                id: uuidv4(),
                auth_id: authData.user.id,
                email: body.email,
                name: body.name,
                role: body.role,
                phone: body.phone || null,
                address: body.address || null,
                is_verified: true,
                is_active: true,
                solde: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (dbError) {
            // Rollback : supprimer l'utilisateur Auth si l'insertion échoue
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.error("DB insert error:", dbError);
            return res.status(500).json({ error: "Impossible de créer l'utilisateur en base" });
        }

        return res.status(201).json({
            message: "Utilisateur créé avec succès",
            user: userData,
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
        console.error("Error /api/users/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
