import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

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

        const { error: notifError } = await supabaseAdmin
            .from("notifications")
            .insert({
                user_id: commande.vendeur_id,
                type: "commande",
                titre: "Commande en attente de traitement",
                message: `La commande #${commande.numero} est en attente. Veuillez la prendre en charge dès que possible.`,
                lien: `/dashboard/commandes`,
                is_read: false,
                created_at: new Date().toISOString(),
            });

        if (notifError) {
            console.error("Erreur envoi alerte boutique:", notifError);
            return res.status(500).json({ error: "Impossible d'envoyer l'alerte" });
        }

        return res.status(200).json({ message: `Alerte envoyée pour la commande #${commande.numero}` });
    } catch (err) {
        console.error("Error /api/commandes/[id]/alert-boutique:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
