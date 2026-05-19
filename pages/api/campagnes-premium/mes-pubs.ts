import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserRole } from "../../../app/lib/middlewares/requireUserRole";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserRole(["Boutique", "Administrateur"])(req, res);
        if (!auth) return;

        const { data, error } = await supabaseAdmin
            .from("publicites_premium")
            .select(`
                *,
                categorie:categorie_id (id, nom, slug)
            `)
            .eq("boutique_id", auth.user.id)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: "Impossible de charger vos publicités", detail: error.message });

        return res.status(200).json({ publicites_premium: data });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
