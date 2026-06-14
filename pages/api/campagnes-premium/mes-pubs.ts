import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserRole } from "../../../app/lib/middlewares/requireUserRole";
import { resolveBoutiqueIdFor } from "../../../app/lib/middlewares/requireBoutiqueAccess";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserRole(["Boutique", "Administrateur"])(req, res);
        if (!auth) return;

        // Phase 2 : pour un gérant Boutique, on filtre par le boutique_id résolu
        // via membership (= proprio). Admin garde son comportement actuel (= toutes
        // les pubs où boutique_id = son propre id, peu d'intérêt pratique mais
        // on conserve la rétrocompatibilité).
        const boutiqueId = (await resolveBoutiqueIdFor(auth.user.id, auth.user.role)) ?? auth.user.id;

        const { data, error } = await supabaseAdmin
            .from("publicites_premium")
            .select(`
                *,
                categorie:categorie_id (id, nom, slug)
            `)
            .eq("boutique_id", boutiqueId)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: "Impossible de charger vos publicités", detail: error.message });

        return res.status(200).json({ publicites_premium: data });
    } catch {
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
