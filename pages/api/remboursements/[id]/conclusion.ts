// pages/api/remboursements/[id]/conclusion.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { declencherRemboursement } from "../../../../app/lib/remboursement";
import { envoyerPushFCM } from "../../../../app/lib/sendPushFCM";

/**
 * @swagger
 * /api/remboursements/{id}/conclusion:
 *   patch:
 *     summary: Conclusion de l'admin (valide ou rejette le remboursement)
 *     description: >
 *       Décision finale de l'administrateur après traitement. En cas de
 *       validation, le remboursement est déclenché (commande/paiement marqués
 *       "Remboursée", soldes contre-passés, client notifié). En cas de rejet,
 *       une conclusion explicative est requise.
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
 *                 enum: [Valider, Rejeter]
 *               conclusion_admin:
 *                 type: string
 *                 description: Obligatoire si decision = Rejeter
 *     responses:
 *       200: { description: Conclusion enregistrée }
 *       400: { description: Données invalides }
 *       403: { description: Administrateur requis }
 *       404: { description: Demande introuvable }
 *       409: { description: La demande n'est pas en cours de traitement }
 *       500: { description: Erreur serveur }
 */

const schema = z
  .object({
    decision: z.enum(["Valider", "Rejeter"]),
    conclusion_admin: z.string().optional(),
  })
  .refine(
    (d) =>
      d.decision !== "Rejeter" ||
      (d.conclusion_admin && d.conclusion_admin.trim().length >= 5),
    { message: "Une conclusion d'au moins 5 caractères est requise pour un rejet", path: ["conclusion_admin"] },
  );

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

    const body = schema.parse(req.body);

    const { data: rb, error: rbError } = await supabaseAdmin
      .from("remboursements")
      .select("id, statut, user_id, vendeur_id, montant, commandes(numero)")
      .eq("id", id)
      .maybeSingle();

    if (rbError || !rb) {
      return res.status(404).json({ error: "Demande de remboursement introuvable" });
    }

    // La conclusion suppose que le dossier a été pris en charge.
    if (rb.statut !== "En traitement par l'admin") {
      return res.status(409).json({
        error: "Veuillez d'abord prendre la demande en charge avant de la conclure",
      });
    }

    const numero = (rb as { commandes?: { numero?: string } | null }).commandes?.numero ?? "";
    const nouveauStatut = body.decision === "Valider" ? "Remboursée" : "Rejetée";

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("remboursements")
      .update({
        statut: nouveauStatut,
        conclusion_admin: body.conclusion_admin ?? null,
        traite_par: profile.id,
        rembourse_le: body.decision === "Valider" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[remboursements/conclusion]", updateError);
      return res.status(500).json({ error: "Impossible d'enregistrer la conclusion" });
    }

    // Validation → déclencher le remboursement effectif
    if (body.decision === "Valider") {
      const result = await declencherRemboursement(id);
      if (!result.ok) {
        // Rollback du statut pour rester cohérent
        await supabaseAdmin
          .from("remboursements")
          .update({ statut: "En traitement par l'admin", rembourse_le: null })
          .eq("id", id);
        return res
          .status(500)
          .json({ error: result.error ?? "Échec du déclenchement du remboursement" });
      }
      // declencherRemboursement notifie déjà le client.
    } else {
      // Rejet → notifier le client
      const notifClient = {
        type: "Commande",
        titre: "Demande de remboursement rejetée",
        message: `Votre demande de remboursement pour la commande ${numero} a été rejetée. Motif : ${body.conclusion_admin}`,
        lien: `/remboursements/${rb.id}`,
      };
      await supabaseAdmin.from("notifications").insert({
        user_id: rb.user_id,
        ...notifClient,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      await envoyerPushFCM([rb.user_id], notifClient);
    }

    // Informer le vendeur de la conclusion
    if (rb.vendeur_id) {
      const notifVendeur = {
        type: "Commande",
        titre: "Conclusion du remboursement",
        message:
          body.decision === "Valider"
            ? `Le remboursement de la commande ${numero} a été validé par l'administration.`
            : `La demande de remboursement de la commande ${numero} a été rejetée par l'administration.`,
        lien: `/remboursements/${rb.id}`,
      };
      await supabaseAdmin.from("notifications").insert({
        user_id: rb.vendeur_id,
        ...notifVendeur,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      await envoyerPushFCM([rb.vendeur_id], notifVendeur);
    }

    return res.status(200).json({ message: "Conclusion enregistrée", remboursement: updated });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Body invalide", issues: err.issues });
    }
    console.error("Error /api/remboursements/[id]/conclusion:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
