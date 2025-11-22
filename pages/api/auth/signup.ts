import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../app/lib/supabaseClient";
import { z, ZodError } from "zod";

// 1️⃣ Schéma Zod pour validation
const signupSchema = z.object({
    email: z.string().email({ message: "Email invalide" }),
    password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères" }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // 2️⃣ Valider les données avec Zod
        const { email, password } = signupSchema.parse(req.body);

        // 3️⃣ Créer l'utilisateur avec Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` // pour email confirmation
            }
        });

        // 4️⃣ Gestion de l'erreur si l'email existe déjà ou autre problème
        if (error) {
            if (error.message.includes("already registered")) {
                return res.status(400).json({ error: "Cet email est déjà utilisé" });
            }
            return res.status(400).json({ error: error.message });
        }

        // 5️⃣ Succès
        return res.status(200).json({ user: data.user, session: data.session });

    } catch (err: unknown) {
        // 6️⃣ Gestion des erreurs de validation Zod
        if (err instanceof ZodError) {
            const formatted = err.issues.map(issue => ({
                field: issue.path[0] ?? "unknown",
                message: issue.message,
            }));
            return res.status(400).json({ errors: formatted });
        }

        // 7️⃣ Erreur serveur
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}