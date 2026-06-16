// pages/api/remboursements/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { resolveBoutiqueIdFor } from "../../../app/lib/middlewares/requireBoutiqueAccess";

/**
 * @swagger
 * /api/remboursements/{id}:
 *   get:
 *     summary: Détail d'une demande de remboursement
 *     description: >
 *       Accessible au client demandeur, au vendeur concerné et aux administrateurs.
 *     tags:
 *       - Remboursements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Détail de la demande }
 *       403: { description: Accès refusé }
 *       404: { description: Demande introuvable }
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

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID invalide" });
    }

    const { data: rb, error } = await supabaseAdmin
      .from("remboursements")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !rb) {
      return res.status(404).json({ error: "Demande de remboursement introuvable" });
    }

    // Contrôle d'accès : client demandeur, vendeur concerné, ou admin
    const row = rb as unknown as { user_id: string; vendeur_id: string | null };
    const boutiqueId = await resolveBoutiqueIdFor(profile.id, profile.role);
    const autorise =
      profile.role === "Administrateur" ||
      row.user_id === profile.id ||
      (row.vendeur_id !== null && row.vendeur_id === boutiqueId);

    if (!autorise) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    return res.status(200).json({ remboursement: rb });
  } catch (err) {
    console.error("Error /api/remboursements/[id]:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
