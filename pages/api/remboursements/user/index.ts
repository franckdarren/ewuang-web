// pages/api/remboursements/user/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/remboursements/user:
 *   get:
 *     summary: Liste les demandes de remboursement du client connecté
 *     tags:
 *       - Remboursements
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Liste des demandes du client }
 *       500: { description: Erreur serveur }
 */

const SELECT = `
  *,
  vendeur:users!remboursements_vendeur_id_fkey (id, name),
  commandes (id, numero, statut, prix)
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const { data, error } = await supabaseAdmin
      .from("remboursements")
      .select(SELECT)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[remboursements/user]", error);
      return res.status(500).json({ error: "Impossible de récupérer vos remboursements" });
    }

    return res.status(200).json({ remboursements: data ?? [] });
  } catch (err) {
    console.error("Error /api/remboursements/user:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
