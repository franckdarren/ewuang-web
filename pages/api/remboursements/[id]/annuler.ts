// pages/api/remboursements/[id]/annuler.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/remboursements/{id}/annuler:
 *   patch:
 *     summary: Le client annule sa demande de remboursement
 *     description: >
 *       Possible uniquement tant que le vendeur n'a pas répondu
 *       (statut "En attente réponse vendeur").
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
 *       200: { description: Demande annulée }
 *       403: { description: Cette demande ne vous appartient pas }
 *       404: { description: Demande introuvable }
 *       409: { description: La demande ne peut plus être annulée }
 *       500: { description: Erreur serveur }
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
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

    const { data: rb, error: rbError } = await supabaseAdmin
      .from("remboursements")
      .select("id, statut, user_id")
      .eq("id", id)
      .maybeSingle();

    if (rbError || !rb) {
      return res.status(404).json({ error: "Demande de remboursement introuvable" });
    }
    if (rb.user_id !== profile.id) {
      return res.status(403).json({ error: "Cette demande ne vous appartient pas" });
    }
    if (rb.statut !== "En attente réponse vendeur") {
      return res
        .status(409)
        .json({ error: "Cette demande ne peut plus être annulée" });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("remboursements")
      .update({ statut: "Annulée", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[remboursements/annuler]", updateError);
      return res.status(500).json({ error: "Impossible d'annuler la demande" });
    }

    return res.status(200).json({ message: "Demande annulée", remboursement: updated });
  } catch (err) {
    console.error("Error /api/remboursements/[id]/annuler:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
