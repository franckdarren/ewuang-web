// pages/api/commandes/[id]/valider.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/{id}/valider:
 *   post:
 *     summary: Le client valide une commande créée par une boutique pour lui
 *     description: >
 *       Bascule une commande de "En attente de validation client" vers "En attente"
 *       (prête à payer). Le client peut aussi confirmer/modifier l'adresse de livraison
 *       à cette étape. Le paiement PVIT doit ensuite être initié séparément via
 *       /api/paiements/initiate-existing-commande (ou via l'UI Flutter).
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
 *               adresse_livraison:
 *                 type: string
 *                 description: Adresse confirmée par le client (remplace celle proposée par la boutique)
 *     responses:
 *       200:
 *         description: Commande validée — prête à payer
 *       400:
 *         description: Commande dans un état non validable
 *       403:
 *         description: Vous n'êtes pas le client de cette commande
 *       404:
 *         description: Commande introuvable
 */

const validerSchema = z.object({
  adresse_livraison: z.string().max(255).optional(),
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

    const body = validerSchema.parse(req.body ?? {});

    const { data: commande, error } = await supabaseAdmin
      .from("commandes")
      .select("id, statut, user_id, expire_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !commande) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    if (commande.user_id !== auth.profile.id) {
      return res.status(403).json({ error: "Vous n'êtes pas le client de cette commande" });
    }

    if (commande.statut !== "En attente de validation client") {
      return res.status(400).json({
        error: `Commande dans un état non validable (${commande.statut})`,
      });
    }

    if (commande.expire_at && new Date(commande.expire_at) < new Date()) {
      return res.status(400).json({
        error: "Le délai de validation est dépassé. Demandez à la boutique d'en créer une nouvelle.",
      });
    }

    const updates: Record<string, any> = {
      statut: "En attente",
      adresse_a_confirmer: false,
      expire_at: null,
      updated_at: new Date().toISOString(),
    };
    if (body.adresse_livraison) {
      updates.adresse_livraison = body.adresse_livraison;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("commandes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: "Impossible de valider la commande" });
    }

    return res.status(200).json({
      message: "Commande validée. Vous pouvez maintenant procéder au paiement.",
      commande: updated,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }
    console.error("Error /api/commandes/[id]/valider:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
