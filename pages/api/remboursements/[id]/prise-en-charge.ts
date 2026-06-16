// pages/api/remboursements/[id]/prise-en-charge.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/remboursements/{id}/prise-en-charge:
 *   patch:
 *     summary: L'admin prend en charge la demande (en traitement)
 *     description: >
 *       L'administrateur signale qu'il étudie le dossier. La demande passe en
 *       "En traitement par l'admin". Il reviendra ensuite donner sa conclusion.
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
 *       200: { description: Prise en charge enregistrée }
 *       403: { description: Administrateur requis }
 *       404: { description: Demande introuvable }
 *       409: { description: La demande n'est pas en attente d'arbitrage }
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

    if (profile.role !== "Administrateur") {
      return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
    }

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID invalide" });
    }

    const { data: rb, error: rbError } = await supabaseAdmin
      .from("remboursements")
      .select("id, statut, user_id, vendeur_id, commandes(numero)")
      .eq("id", id)
      .maybeSingle();

    if (rbError || !rb) {
      return res.status(404).json({ error: "Demande de remboursement introuvable" });
    }

    if (rb.statut !== "En attente arbitrage admin") {
      return res
        .status(409)
        .json({ error: "Cette demande n'est pas en attente d'arbitrage" });
    }

    const numero = (rb as { commandes?: { numero?: string } | null }).commandes?.numero ?? "";

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("remboursements")
      .update({
        statut: "En traitement par l'admin",
        traite_par: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[remboursements/prise-en-charge]", updateError);
      return res.status(500).json({ error: "Impossible de prendre en charge la demande" });
    }

    // Notifier le client et le vendeur que le dossier est en traitement
    const destinataires = [rb.user_id, rb.vendeur_id].filter(
      (uid): uid is string => Boolean(uid),
    );
    if (destinataires.length) {
      await supabaseAdmin.from("notifications").insert(
        destinataires.map((uid) => ({
          user_id: uid,
          type: "Commande" as const,
          titre: "Remboursement en traitement",
          message: `L'administration traite la demande de remboursement de la commande ${numero}. Une conclusion vous sera communiquée.`,
          lien: `/remboursements/${rb.id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        })),
      );
    }

    return res.status(200).json({ message: "Demande prise en charge", remboursement: updated });
  } catch (err) {
    console.error("Error /api/remboursements/[id]/prise-en-charge:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
