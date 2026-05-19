import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { data: promos, error } = await supabaseAdmin
            .from("codes_promo")
            .select(`
                *,
                articles (id, nom, image_principale)
            `)
            .eq("boutique_id", profile.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ promos });
    } catch (err) {
        console.error("Error /api/codes-promo/list:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
