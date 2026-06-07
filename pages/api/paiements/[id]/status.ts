// pages/api/paiements/[id]/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { pvitGetStatus } from "../../../../app/lib/pvit";

/**
 * @swagger
 * /api/paiements/{id}/status:
 *   get:
 *     summary: Vérifie le statut d'un paiement
 *     description: >
 *       Interroge PVIT pour obtenir l'état actuel d'une transaction et met à jour
 *       l'enregistrement local si le statut a changé. Utile pour le polling côté client
 *       en attendant le webhook.
 *     tags:
 *       - Paiements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du paiement (paiements.id)
 *     responses:
 *       200:
 *         description: Statut du paiement
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Paiement introuvable
 *       500:
 *         description: Erreur serveur
 */

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
      return res.status(400).json({ error: "ID de paiement requis" });
    }

    // Récupérer le paiement local
    const { data: paiement, error: fetchError } = await supabaseAdmin
      .from("paiements")
      .select("id, user_id, statut, transaction_id, reference, montant, methode, details, created_at, commandes(id, statut, numero)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !paiement) {
      return res.status(404).json({ error: "Paiement introuvable" });
    }

    // Un utilisateur ne peut voir que ses propres paiements (l'admin peut voir tous)
    if (profile.role !== "Administrateur" && paiement.user_id !== profile.id) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    // Si déjà dans un état terminal, retourner sans appeler PVIT
    if (paiement.statut === "valide" || paiement.statut === "echoue") {
      return res.status(200).json({
        paiement_id: paiement.id,
        statut: paiement.statut,
        montant: paiement.montant,
        commandes: paiement.commandes,
        source: "local",
      });
    }

    // Interroger PVIT si on a un transaction_id
    if (paiement.transaction_id) {
      try {
        const pvitStatus = await pvitGetStatus(paiement.transaction_id);

        const statutMapped =
          pvitStatus.status === "completed"
            ? "valide"
            : pvitStatus.status === "failed" || pvitStatus.status === "cancelled"
            ? "echoue"
            : "en_attente";

        // Mettre à jour localement si le statut a changé
        if (statutMapped !== paiement.statut) {
          await supabaseAdmin
            .from("paiements")
            .update({
              statut: statutMapped,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paiement.id);
        }

        return res.status(200).json({
          paiement_id: paiement.id,
          statut: statutMapped,
          montant: paiement.montant,
          commandes: paiement.commandes,
          pvit_statut: pvitStatus.status,
          source: "pvit",
        });
      } catch (pvitErr) {
        // Si PVIT est indisponible, on retourne le statut local sans erreur fatale
        console.warn("[paiements/status] PVIT indisponible:", pvitErr);
      }
    }

    return res.status(200).json({
      paiement_id: paiement.id,
      statut: paiement.statut,
      montant: paiement.montant,
      commandes: paiement.commandes,
      source: "local",
    });
  } catch (err) {
    console.error("Error /api/paiements/[id]/status:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
