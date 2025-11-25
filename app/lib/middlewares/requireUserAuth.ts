import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../supabaseAdmin";

/**
 * Vérifie que l'utilisateur est connecté et existe dans public.users
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
    const { data: userRecord, error: dbError } = await supabaseAdmin
        .from("users")
        .select("id, auth_id")
        .eq("auth_id", auth_id)
        .single();

    if (dbError || !userRecord) {
        res.status(403).json({ error: "Accès interdit : utilisateur non trouvé" });
        return null;
    }

    return {
        authUser: user,
        profile: userRecord
    };
}
