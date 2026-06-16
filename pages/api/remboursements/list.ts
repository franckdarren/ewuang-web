// pages/api/remboursements/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/remboursements/list:
 *   get:
 *     summary: Liste toutes les demandes de remboursement (admin)
 *     description: Accessible uniquement aux administrateurs. Filtrage optionnel par statut.
 *     tags:
 *       - Remboursements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des demandes }
 *       403: { description: Administrateur requis }
 *       500: { description: Erreur serveur }
 */

const SELECT = `
  *,
  client:users!remboursements_user_id_fkey (id, name, email, phone),
  vendeur:users!remboursements_vendeur_id_fkey (id, name, email, phone),
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

    if (profile.role !== "Administrateur") {
      return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
    }

    let query = supabaseAdmin
      .from("remboursements")
      .select(SELECT)
      .order("created_at", { ascending: false });

    const statut = req.query.statut as string | undefined;
    if (statut) query = query.eq("statut", statut);

    const { data, error } = await query;

    if (error) {
      console.error("[remboursements/list]", error);
      return res.status(500).json({ error: "Impossible de récupérer les remboursements" });
    }

    return res.status(200).json({ remboursements: data ?? [] });
  } catch (err) {
    console.error("Error /api/remboursements/list:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
