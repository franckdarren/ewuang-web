import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

const PROFILE_SELECT = "id, auth_id, role, email, name, phone, solde";

export async function requireUserAuth(req: NextApiRequest, res: NextApiResponse) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "Non autorisé : token manquant" });
        return null;
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
        res.status(401).json({ error: "Non autorisé : token invalide" });
        return null;
    }

    const auth_id = user.id;

    // maybeSingle : null si absent, pas d'erreur sur 0 ligne
    let { data: userRecord, error: dbError } = await supabaseAdmin
        .from("users")
        .select(PROFILE_SELECT)
        .eq("auth_id", auth_id)
        .maybeSingle();

    if (dbError) {
        console.error("[requireUserAuth] Erreur select:", dbError);
    }

    if (!userRecord) {
        // Tentative d'insertion
        const { data: created, error: createError } = await supabaseAdmin
            .from("users")
            .insert({
                id: uuidv4(),
                auth_id,
                email: user.email ?? "",
                name: user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Utilisateur",
                role: user.user_metadata?.role ?? "Client",
                phone: null,
                solde: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select(PROFILE_SELECT)
            .maybeSingle();

        if (createError) {
            // Contrainte unique auth_id : le profil existe déjà (race condition)
            // On retente le select
            const { data: retry } = await supabaseAdmin
                .from("users")
                .select(PROFILE_SELECT)
                .eq("auth_id", auth_id)
                .maybeSingle();

            if (!retry) {
                console.error("[requireUserAuth] Impossible de trouver/créer le profil:", createError);
                res.status(403).json({ error: "Accès interdit : profil utilisateur introuvable" });
                return null;
            }
            userRecord = retry;
        } else {
            userRecord = created;
        }
    }

    if (!userRecord) {
        res.status(403).json({ error: "Accès interdit : profil utilisateur introuvable" });
        return null;
    }

    return { authUser: user, profile: userRecord };
}
