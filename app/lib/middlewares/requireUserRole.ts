import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../supabaseAdmin";

/**
 * Middleware pour protéger une route selon le rôle
 * @param roles Tableau de rôles autorisés (ex: ["Client", "Boutique"])
 */
export function requireUserRole(roles: string[]) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "Non autorisé : token manquant" });
            return null;
        }

        // Vérifie le token et récupère l'utilisateur
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            res.status(401).json({ error: "Non autorisé : token invalide" });
            return null;
        }

        const auth_id = user.id;

        // Récupère l'utilisateur dans public.users
        const { data: userRecord, error: dbError } = await supabaseAdmin
            .from("users")
            .select("id, auth_id, role")
            .eq("auth_id", auth_id)
            .single();

        if (dbError || !userRecord) {
            res.status(403).json({ error: "Accès interdit : utilisateur non trouvé" });
            return null;
        }

        // Vérifie si le rôle est autorisé
        if (!roles.includes(userRecord.role)) {
            res.status(403).json({ error: "Accès interdit : rôle non autorisé" });
            return null;
        }

        // Tout est OK → on retourne l'utilisateur et auth_id
        return { auth_id, user: userRecord };
    };
}
