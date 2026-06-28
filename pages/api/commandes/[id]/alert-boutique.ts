import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";
import { notifyBoutiqueMembres } from "../../../../app/lib/notifyBoutique";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "commandes.write");
        if (!auth) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de commande invalide" });
        }

        const { data: commande, error: cmdError } = await supabaseAdmin
            .from("commandes")
            .select("id, numero, statut, vendeur_id")
            .eq("id", id)
            .single();

        if (cmdError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        if (!commande.vendeur_id) {
            return res.status(400).json({ error: "Cette commande n'est associée à aucune boutique" });
        }

        // Phase 2 : fan-out à tous les membres actifs de la boutique
        // (proprio + gérants), pas seulement au vendeur_id historique.
        await notifyBoutiqueMembres(commande.vendeur_id, {
            type: "Commande",
            titre: "Commande en attente de traitement",
            message: `La commande #${commande.numero} est en attente. Veuillez la prendre en charge dès que possible.`,
            lien: `/dashboard/commandes`,
        });

        return res.status(200).json({ message: `Alerte envoyée pour la commande #${commande.numero}` });
    } catch (err) {
        console.error("Error /api/commandes/[id]/alert-boutique:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
