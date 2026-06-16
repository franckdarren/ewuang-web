// pages/api/commandes/[id]/refuser.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/{id}/refuser:
 *   post:
 *     summary: Le client refuse une commande créée par une boutique pour lui
 *     description: >
 *       Libère le stock réservé et passe la commande en statut "Refusée par le client".
 *       Ne peut être appelé que pour une commande en "En attente de validation client".
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motif:
 *                 type: string
 *                 description: Motif optionnel du refus (notifié à la boutique)
 *     responses:
 *       200:
 *         description: Commande refusée — stock libéré
 *       400:
 *         description: Commande dans un état non refusable
 *       403:
 *         description: Vous n'êtes pas le client de cette commande
 */

const refuserSchema = z.object({
  motif: z.string().max(255).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: "id manquant" });

    const body = refuserSchema.parse(req.body ?? {});

    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select("id, statut, user_id, numero, creee_par_boutique_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !commande) return res.status(404).json({ error: "Commande introuvable" });

    if (commande.user_id !== auth.profile.id) {
      return res.status(403).json({ error: "Vous n'êtes pas le client de cette commande" });
    }

    if (commande.statut !== "En attente de validation client") {
      return res.status(400).json({
        error: `Commande dans un état non refusable (${commande.statut})`,
      });
    }

    // Libérer le stock
    const { error: rpcError } = await supabaseAdmin.rpc("liberer_stock_commande", {
      p_commande_id: id,
    });
    if (rpcError) {
      console.error("[refuser] liberer_stock:", rpcError);
      return res.status(500).json({ error: "Impossible de libérer le stock" });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("commandes")
      .update({
        statut: "Refusée par le client",
        expire_at: null,
        commentaire: body.motif ? `Refus client : ${body.motif}` : commande.numero,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: "Impossible de mettre à jour la commande" });
    }

    // Notifier la boutique
    if (commande.creee_par_boutique_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: commande.creee_par_boutique_id,
        type: "commande",
        titre: "Commande refusée par le client",
        message: `Le client a refusé la commande ${commande.numero}.${body.motif ? ` Motif : ${body.motif}` : ""}`,
        lien: `/commandes/${commande.id}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      message: "Commande refusée. Le stock a été libéré.",
      commande: updated,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }
    console.error("Error /api/commandes/[id]/refuser:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
