import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../app/lib/supabaseClient";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { z, ZodError } from "zod";

// Schéma Zod
const signinSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { email, password } = signinSchema.parse(req.body);

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
