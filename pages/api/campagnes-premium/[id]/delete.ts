import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "publicites_premium.delete");
        if (!auth) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") return res.status(400).json({ error: "ID invalide" });

        const { error } = await supabaseAdmin
            .from("publicites_premium")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("[campagnes-premium/delete] error:", error);
            return res.status(500).json({ error: "Impossible de supprimer la publicité premium" });
        }

        return res.status(200).json({ success: true });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
