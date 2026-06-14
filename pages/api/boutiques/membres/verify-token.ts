import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "../../../../app/lib/supabaseSafeAdmin";

/**
 * @swagger
 * /api/boutiques/membres/verify-token:
 *   get:
 *     tags: ["Boutique Membres"]
 *     summary: "Vérifie un token d'invitation sans le consommer"
 *     description: >
 *       Endpoint anonyme utilisé par la page web `/invite/accept` pour vérifier
 *       qu'un token est valide AVANT que l'invité saisisse son mot de passe.
 *       Retourne les infos publiques nécessaires à l'affichage (nom commercial
 *       de la boutique, email cible). Le token reste utilisable.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: "Token valide — infos boutique retournées"
 *       400: { description: "Token invalide, expiré ou déjà utilisé" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const token = req.query.token;
    if (typeof token !== "string" || token.length < 32) {
        return res.status(400).json({ error: "Token invalide" });
    }

    try {
        const supabaseAdmin = getSupabaseAdmin();

        const { data: invitation, error } = await supabaseAdmin
            .from("boutique_membres")
            .select("id, boutique_id, email, statut, expires_at")
            .eq("invite_token", token)
            .maybeSingle();

        if (error || !invitation) {
            return res.status(400).json({ error: "Invitation introuvable" });
        }
        if (invitation.statut !== "pending") {
            return res.status(400).json({
                error: invitation.statut === "active"
                    ? "Cette invitation a déjà été acceptée"
                    : "Cette invitation a été révoquée",
            });
        }
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ error: "Cette invitation a expiré" });
        }

        // Récupère le nom commercial de la boutique pour rassurer l'invité
        const { data: boutique } = await supabaseAdmin
            .from("users")
            .select("name, owner_name, url_logo")
            .eq("id", invitation.boutique_id)
            .single();

        return res.status(200).json({
            email: invitation.email,
            boutique: {
                name: boutique?.name ?? "Boutique",
                owner_name: boutique?.owner_name ?? null,
                url_logo: boutique?.url_logo ?? null,
            },
            expires_at: invitation.expires_at,
        });
    } catch (err) {
        console.error("[verify-token] error:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
