import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../app/lib/supabaseClient";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { getSupabaseAdmin } from "../../../app/lib/supabaseSafeAdmin";
import { getSupabaseClient } from "../../../app/lib/supabaseSafeClient";
import { z, ZodError } from "zod";

// Schéma Zod
const signinSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

// Swagger Documentation
/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     summary: Connexion utilisateur (Email + Mot de passe)
 *     description: |
 *       Authentifie un utilisateur via Supabase Auth (email/password)  
 *       puis retourne également les informations du profil stocké dans `public.users`.
 *     tags:
 *       - Auth
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *
 *     responses:
 *       200:
 *         description: Authentification réussie + profil utilisateur
 *         content:
 *           application/json:
 *             example:
 *               auth:
 *                 user:
 *                   id: "95f2b0b2-d2d1-4e15-ae59-fe9af1769ddf"
 *                   email: "test@example.com"
 *                 session:
 *                   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI..."
 *                   token_type: "bearer"
 *                   expires_in: 3600
 *               profile:
 *                 id: "6337aed8-0616-43fa-90dc-8dfa005530ab"
 *                 auth_id: "95f2b0b2-d2d1-4e15-ae59-fe9af1769ddf"
 *                 name: "Yaya Nills"
 *                 role: "Client"
 *                 email: "test@example.com"
 *                 solde: 0
 *                 created_at: "2025-11-23T18:59:33.945Z"
 *                 updated_at: "2025-11-23T18:59:33.945Z"
 *
 *       400:
 *         description: Erreur de validation Zod ou erreur Supabase Auth
 *         content:
 *           application/json:
 *             example:
 *               error: "Invalid login credentials"
 *
 *       404:
 *         description: Profil utilisateur introuvable dans public.users
 *         content:
 *           application/json:
 *             example:
 *               error: "Profil utilisateur introuvable"
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur interne
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { email, password } = signinSchema.parse(req.body);

        const supabase = getSupabaseClient();
        const supabaseAdmin = getSupabaseAdmin();

        // 1️⃣ Connexion Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) return res.status(400).json({ error: authError.message });

        const authUser = authData.user;

        // 2️⃣ Récupérer le profil dans public.users
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("auth_id", authUser.id)
            .single();


        if (profileError) {
            console.log("PROFILE ERROR :", profileError);
            return res.status(404).json({ error: "Profil utilisateur introuvable" });
        }

        // 3️⃣ Retourner tout
        return res.status(200).json({
            auth: {
                user: authUser,
                session: authData.session,
            },
            profile, // infos de ta table public.users
        });

    } catch (err: unknown) {
        if (err instanceof ZodError) {
            const formatted = err.issues.map(i => ({ field: i.path[0] ?? "unknown", message: i.message }));
            return res.status(400).json({ errors: formatted });
        }
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
