// pages/api/remboursements/[id]/decision-vendeur.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import { envoyerPushFCM } from "../../../../app/lib/sendPushFCM";

/**
 * @swagger
 * /api/remboursements/{id}/decision-vendeur:
 *   patch:
 *     summary: Réponse du vendeur à une demande de remboursement
 *     description: >
 *       Le vendeur accepte ou refuse la demande. Dans les deux cas, la demande
 *       passe en arbitrage administrateur (l'admin valide toujours). En cas de
 *       refus, un motif est obligatoire.
 *     tags:
 *       - Remboursements
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [Acceptée, Refusée]
 *               motif_vendeur:
 *                 type: string
 *                 description: Obligatoire si decision = Refusée
 *     responses:
 *       200: { description: Décision enregistrée }
 *       400: { description: Données invalides }
 *       403: { description: Vous n'êtes pas le vendeur de cette commande }
 *       404: { description: Demande introuvable }
 *       409: { description: La demande n'est plus en attente de votre réponse }
 *       500: { description: Erreur serveur }
 */

const schema = z
  .object({
    decision: z.enum(["Acceptée", "Refusée"]),
    motif_vendeur: z.string().optional(),
  })
  .refine(
    (d) => d.decision !== "Refusée" || (d.motif_vendeur && d.motif_vendeur.trim().length >= 5),
    { message: "Un motif d'au moins 5 caractères est requis pour un refus", path: ["motif_vendeur"] },
  );

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const access = await requireBoutiqueAccess(req, res);
    if (!access) return;
    const { boutiqueId } = access;

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID invalide" });
    }

    const body = schema.parse(req.body);

    // Charger la demande + numéro de commande
    const { data: rb, error: rbError } = await supabaseAdmin
      .from("remboursements")
      .select("id, statut, vendeur_id, user_id, commande_id, commandes(numero)")
      .eq("id", id)
      .maybeSingle();

    if (rbError || !rb) {
      return res.status(404).json({ error: "Demande de remboursement introuvable" });
    }

    // Vérifier que l'appelant est bien le vendeur concerné
    if (rb.vendeur_id !== boutiqueId) {
      return res
        .status(403)
        .json({ error: "Vous n'êtes pas le vendeur concerné par cette demande" });
    }

    if (rb.statut !== "En attente réponse vendeur") {
      return res
        .status(409)
        .json({ error: "Cette demande n'attend plus votre réponse" });
    }

    const numero = (rb as { commandes?: { numero?: string } | null }).commandes?.numero ?? "";

    // Enregistrer la décision → arbitrage admin
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("remboursements")
      .update({
        decision_vendeur: body.decision,
        motif_vendeur: body.decision === "Refusée" ? body.motif_vendeur : null,
        statut: "En attente arbitrage admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[remboursements/decision-vendeur]", updateError);
      return res.status(500).json({ error: "Impossible d'enregistrer la décision" });
    }

    // Notifier le client
    const notifClient = {
      type: "Commande",
      titre: "Réponse du vendeur à votre remboursement",
      message:
        body.decision === "Acceptée"
          ? `Le vendeur a accepté votre demande de remboursement (commande ${numero}). En attente de validation par l'administration.`
          : `Le vendeur a refusé votre demande de remboursement (commande ${numero}). L'administration va trancher.`,
      lien: `/remboursements/${rb.id}`,
    };
    await supabaseAdmin.from("notifications").insert({
      user_id: rb.user_id,
      ...notifClient,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    await envoyerPushFCM([rb.user_id], notifClient);

    // Notifier les administrateurs
    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "Administrateur");

    if (admins?.length) {
      const notifAdmin = {
        type: "Système",
        titre: "Remboursement à arbitrer",
        message: `Le vendeur a ${body.decision === "Acceptée" ? "accepté" : "refusé"} une demande de remboursement (commande ${numero}). À arbitrer.`,
        lien: "/dashboard/remboursements",
      };
      await supabaseAdmin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.id,
          ...notifAdmin,
          is_read: false,
          created_at: new Date().toISOString(),
        })),
      );
      // No-op si les admins n'ont pas d'app mobile (console web), mais utile
      // pour ceux qui ont l'app installée.
      await envoyerPushFCM(admins.map((a) => a.id), notifAdmin);
    }

    return res.status(200).json({ message: "Décision enregistrée", remboursement: updated });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Body invalide", issues: err.issues });
    }
    console.error("Error /api/remboursements/[id]/decision-vendeur:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
