import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { z, ZodError } from "zod";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

// Schema de modification
const updateSchema = z.object({
    name: z.string().min(3).optional(),
    address: z.string().optional(),
    url_logo: z.string().optional(),
    phone: z.string().optional(),
    heure_ouverture: z.string().optional(),
    heure_fermeture: z.string().optional(),
    description: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // 🔐 Middleware : vérifie token + utilisateur
        const auth = await requireUserAuth(req, res);
        if (!auth) return; // réponse déjà envoyée si non autorisé

        const { auth_id } = auth;

        // 1️⃣ Valider les champs envoyés
        const body = updateSchema.parse(req.body);

        // 2️⃣ Mettre à jour uniquement le profil de l'utilisateur connecté
        const { data, error } = await supabaseAdmin
            .from("users")
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq("auth_id", auth_id)
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Impossible de mettre à jour le profil" });
        }

        return res.status(200).json({ user: data });

    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path[0],
                    message: i.message,
                })),
            });
        }

        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
