import type { NextApiRequest, NextApiResponse } from "next";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import { getSupabaseAdmin } from "../../../../app/lib/supabaseSafeAdmin";

/**
 * @swagger
 * /api/boutiques/membres/{id}:
 *   delete:
 *     tags: ["Boutique Membres"]
 *     summary: "Révoque un membre (pending ou actif) — proprio uniquement"
 *     description: >
 *       Marque la ligne `boutique_membres` comme `revoked`. Le compte
 *       `public.users` du gérant N'EST PAS supprimé : il garde son identité
 *       (il peut éventuellement rejoindre une autre boutique plus tard via
 *       une nouvelle invitation). Seul son accès aux ressources de la
 *       boutique courante est coupé.
 *
 *       Refus si on tente de révoquer le proprio (la boutique ne peut pas
 *       être sans proprio — la transmission de propriété est un flux séparé).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: "Membre révoqué" }
 *       403: { description: "Proprio uniquement / tentative auto-révocation" }
 *       404: { description: "Membre introuvable ou pas dans votre boutique" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        if (!access.isProprio) {
            return res.status(403).json({
                error: "Seul le propriétaire peut révoquer un membre",
            });
        }

        const { id } = req.query;
        if (typeof id !== "string") {
            return res.status(400).json({ error: "ID invalide" });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // 1️⃣ Charge le membre + vérifie qu'il appartient à la boutique de l'appelant
        const { data: membre, error: loadError } = await supabaseAdmin
            .from("boutique_membres")
            .select("id, boutique_id, role_membre, statut")
            .eq("id", id)
            .maybeSingle();

        if (loadError || !membre) {
            return res.status(404).json({ error: "Membre introuvable" });
        }

        if (membre.boutique_id !== access.boutiqueId) {
            return res.status(404).json({ error: "Membre introuvable" });
        }

        if (membre.role_membre === "proprio") {
            return res.status(403).json({
                error: "Impossible de révoquer le propriétaire de la boutique",
            });
        }

        if (membre.statut === "revoked") {
            return res.status(400).json({ error: "Ce membre est déjà révoqué" });
        }

        // 2️⃣ Révocation
        const { data: revoked, error: revokeError } = await supabaseAdmin
            .from("boutique_membres")
            .update({
                statut: "revoked",
                revoked_at: new Date().toISOString(),
                invite_token: null,  // invalide tout lien encore en circulation
            })
            .eq("id", id)
            .select()
            .single();

        if (revokeError) {
            console.error("[revoke] error:", revokeError);
            return res.status(500).json({ error: "Impossible de révoquer le membre" });
        }

        return res.status(200).json({ membre: revoked });
    } catch (err) {
        console.error("[revoke] error:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
