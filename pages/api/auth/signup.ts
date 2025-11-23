import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { email, password, name, role } = signupSchema.parse(req.body);

        // 1️⃣ Signup Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
        });

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

        console.log("Auth ID:", authData.user?.id);
        console.log("Inserted user:", userData);


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
