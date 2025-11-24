import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { getSupabaseAdmin } from "../../../app/lib/supabaseSafeAdmin";
import { getSupabaseClient } from "../../../app/lib/supabaseSafeClient";
import { supabase } from "../../../app/lib/supabaseClient";
import { z, ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";

// Schéma Zod
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(3).optional(),
    role: z.enum(["Client", "Boutique", "Livreur"]).optional(),
});

// Swagger Documentation
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Inscription d'un nouvel utilisateur
 *     description: >
 *       Crée un utilisateur dans Supabase Auth puis enregistre ses informations dans la table
 *       `public.users`. Retourne également la session Supabase si l'inscription réussit.
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
 *                 example: "exemple@mail.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "motdepasse123"
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 example: "Darren"
 *               role:
 *                 type: string
 *                 enum: [Client, Boutique, Livreur]
 *                 example: "Client"
 *
 *     responses:
 *       200:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: Profil créé dans public.users
 *                   example:
 *                     id: "d67722e4-d6e2-4bdf-9eea-92df45cc18aa"
 *                     auth_id: "f9b2f7e4-7f7c-4b63-92de-34423c090392"
 *                     email: "exemple@mail.com"
 *                     name: "Darren"
 *                     role: "Client"
 *                     url_logo: null
 *                     phone: null
 *                     address: null
 *                     solde: 0
 *                     created_at: "2025-11-23T18:59:33.945Z"
 *                     updated_at: "2025-11-23T18:59:33.945Z"
 *                 session:
 *                   type: object
 *                   description: Session Supabase Auth
 *
 *       400:
 *         description: Erreur de validation Zod ou erreur Supabase Auth
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *
 *       500:
 *         description: Erreur interne en base de données ou autre
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { email, password, name, role } = signupSchema.parse(req.body);

        const supabase = getSupabaseClient();
        const supabaseAdmin = getSupabaseAdmin();

        // 1️⃣ Signup Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
        });

        console.log("AUTH DATA:", authData);
        console.log("AUTH ERROR:", authError);

        if (authError) return res.status(400).json({ error: authError.message });

        // 2️⃣ Insert utilisateur dans la table users via service_role
        const { data: userData, error: dbError } = await supabaseAdmin
            .from("users")
            .insert({
                id: uuidv4(),
                auth_id: authData.user?.id,
                email: authData.user?.email,
                name: name || null,
                role: role || "client",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        console.log("DB DATA:", userData);
        console.log("DB ERROR:", dbError);


        if (dbError) {
            console.log("DB ERROR:", dbError);
            // Supprime l'utilisateur Auth si l'insertion échoue
            await supabase.auth.admin.deleteUser(authData.user!.id);
            return res.status(500).json({ error: "Impossible de créer l'utilisateur en base" });
        }

        return res.status(200).json({ user: userData, session: authData.session });
    } catch (err: unknown) {
        if (err instanceof ZodError) {
            const formatted = err.issues.map(i => ({ field: i.path[0] ?? "unknown", message: i.message }));
            return res.status(400).json({ errors: formatted });
        }
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
