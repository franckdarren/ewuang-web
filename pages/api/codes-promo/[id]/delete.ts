import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID invalide" });
        }

        const { data: promo } = await supabaseAdmin
            .from("codes_promo")
            .select("boutique_id")
            .eq("id", id)
            .single();

        if (!promo) {
            return res.status(404).json({ error: "Code promo introuvable" });
        }

        if (promo.boutique_id !== profile.id) {
            return res.status(403).json({ error: "Accès refusé" });
        }

        const { error } = await supabaseAdmin
            .from("codes_promo")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return res.status(200).json({ message: "Code promo supprimé" });
    } catch (err) {
        console.error("Error /api/codes-promo/[id]/delete:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
