import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserRole } from "../../../app/lib/middlewares/requireUserRole";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserRole(["Administrateur"])(req, res);
        if (!auth) return;

        const { statut, position } = req.query;

        let query = supabaseAdmin
            .from("publicites_premium")
            .select(`
                *,
                boutique:boutique_id (id, name, email, url_logo),
                categorie:categorie_id (id, nom, slug)
            `)
            .order("created_at", { ascending: false });

        if (statut && typeof statut === "string") {
            query = query.eq("statut", statut);
        }

        if (position && typeof position === "string") {
            query = query.eq("position", position);
        }

        const { data, error } = await query;

        if (error) return res.status(500).json({ error: "Impossible de charger les publicités premium", detail: error.message });

        return res.status(200).json({ publicites_premium: data });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
