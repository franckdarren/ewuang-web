import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../app/lib/middlewares/requireBoutiqueAccess";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        const { data: promos, error } = await supabaseAdmin
            .from("codes_promo")
            .select(`
                *,
                articles (id, nom, image_principale)
            `)
            .eq("boutique_id", access.boutiqueId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ promos });
    } catch (err) {
        console.error("Error /api/codes-promo/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
