import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

/**
 * Vérifie que l'utilisateur est connecté et existe dans public.users.
 * Si le profil est absent, il est auto-créé pour éviter une désynchronisation auth/db.
 */
export async function requireUserAuth(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Non autorisé : token manquant" });
        return null;
    }

    // Récupère l'utilisateur lié au token
    const { data: { user }, error: userError } = await supabaseAdmin
        .auth
        .getUser(token);

    if (userError || !user) {
        res.status(401).json({ error: "Non autorisé : token invalide" });
        return null;
    }

    const auth_id = user.id;

    // Vérifie que l'utilisateur existe dans public.users
    let { data: userRecord, error: dbError } = await supabaseAdmin
        .from("users")
        .select("id, auth_id, role, email, name, phone, solde")
        .eq("auth_id", auth_id)
        .single();

    // Auto-réparation : profil absent → on le crée à partir des données auth
    if (dbError || !userRecord) {
        const { data: created, error: createError } = await supabaseAdmin
            .from("users")
            .insert({
                id: uuidv4(),
                auth_id: auth_id,
                email: user.email ?? "",
                name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Utilisateur",
                role: user.user_metadata?.role ?? "Client",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select("id, auth_id, role, email, name, phone, solde")
            .single();

        if (createError || !created) {
            console.error("[requireUserAuth] Impossible de créer le profil:", createError);
            res.status(403).json({ error: "Accès interdit : utilisateur non trouvé" });
            return null;
        }

        userRecord = created;
    }

    return {
        authUser: user,
        profile: userRecord
    };
}
