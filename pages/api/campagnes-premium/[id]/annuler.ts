import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserRole } from "../../../../app/lib/middlewares/requireUserRole";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserRole(["Administrateur"])(req, res);
        if (!auth) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") return res.status(400).json({ error: "ID invalide" });

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from("publicites_premium")
            .select("id, statut")
            .eq("id", id)
            .single();

        if (fetchError || !existing) return res.status(404).json({ error: "Publicité premium introuvable" });

        if (existing.statut !== "en_attente") {
            return res.status(400).json({ error: "Seules les demandes en attente peuvent être annulées" });
        }

        const { error } = await supabaseAdmin
            .from("publicites_premium")
            .update({ statut: "annule", updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return res.status(500).json({ error: "Impossible d'annuler la publicité" });

        return res.status(200).json({ success: true });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
