import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const { position, categorie_id, boutique_id } = req.query;

        if (!position || typeof position !== "string") {
            return res.status(400).json({ error: "Le paramètre position est requis" });
        }

        const VALID_POSITIONS = ["banniere_accueil", "banniere_categorie", "banniere_boutique"];
        if (!VALID_POSITIONS.includes(position)) {
            return res.status(400).json({ error: "Position invalide" });
        }

        const now = new Date().toISOString();

        let query = supabaseAdmin
            .from("publicites_premium")
            .select(`
                id, position, titre, url_image, lien, description,
                date_start, date_end, boutique_id, categorie_id,
                boutique:boutique_id (id, name, url_logo),
                categorie:categorie_id (id, nom)
            `)
            .eq("statut", "approuve")
            .eq("position", position)
            .lte("date_start", now)
            .gte("date_end", now)
            .order("created_at", { ascending: false });

        if (position === "banniere_categorie" && categorie_id && typeof categorie_id === "string") {
            query = query.eq("categorie_id", categorie_id);
        }

        if (position === "banniere_boutique" && boutique_id && typeof boutique_id === "string") {
            query = query.eq("boutique_id", boutique_id);
        }

        const { data, error } = await query;

        if (error) return res.status(500).json({ error: "Impossible de charger les publicités", detail: error.message });

        return res.status(200).json({ publicites: data });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
