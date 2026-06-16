// pages/api/remboursements/vendeur/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";

/**
 * @swagger
 * /api/remboursements/vendeur:
 *   get:
 *     summary: Liste les demandes de remboursement adressées au vendeur connecté
 *     tags:
 *       - Remboursements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Liste des demandes du vendeur }
 *       403: { description: Rôle Boutique requis }
 *       500: { description: Erreur serveur }
 */

const SELECT = `
  *,
  client:users!remboursements_user_id_fkey (id, name, phone),
  commandes (id, numero, statut, prix)
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const access = await requireBoutiqueAccess(req, res);
    if (!access) return;

    const { data, error } = await supabaseAdmin
      .from("remboursements")
      .select(SELECT)
      .eq("vendeur_id", access.boutiqueId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[remboursements/vendeur]", error);
      return res.status(500).json({ error: "Impossible de récupérer les remboursements" });
    }

    return res.status(200).json({ remboursements: data ?? [] });
  } catch (err) {
    console.error("Error /api/remboursements/vendeur:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
