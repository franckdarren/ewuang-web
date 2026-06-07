// pages/api/paiements/webhook.ts
//
// Appelé par PVIT quand le statut d'un paiement change.
// CRITIQUE : doit répondre { transactionId, responseCode: 200 } pour fermer la boucle.
//
// Structure du payload PVIT :
// {
//   transactionId: "PAY230226742716",
//   merchantReferenceId: "CMD-26-00001-...",
//   status: "SUCCESS" | "FAILED",
//   amount: 5000,
//   customerID: "077XXXXXXX",
//   fees: 3.5,
//   totalAmount: 5003.5,
//   operator: "AIRTEL_MONEY",
//   code: 200
// }

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import {
  pvitVerifyWebhookHmac,
  type PvitWebhookPayload,
  type PvitWebhookAck,
} from "../../../app/lib/pvit";

// Désactiver le bodyParser pour lire le body brut (nécessaire pour HMAC si activé)
export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  // -------------------------------------------------------------------------
  // 1. Lire le body brut
  // -------------------------------------------------------------------------
  const rawBody = await readRawBody(req);

  // Vérification HMAC optionnelle (si PVIT_WEBHOOK_HMAC_SECRET est défini)
  const signature = req.headers["x-pvit-signature"] as string | undefined;
  if (signature && !pvitVerifyWebhookHmac(signature, rawBody)) {
    return res.status(400).json({ error: "Signature webhook invalide" });
  }

  // -------------------------------------------------------------------------
  // 2. Parser le payload PVIT
  // -------------------------------------------------------------------------
  let payload: PvitWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Payload JSON invalide" });
  }

  const { transactionId, merchantReferenceId, status, code } = payload;

  if (!transactionId || !merchantReferenceId || !status) {
    return res.status(400).json({ error: "Payload PVIT incomplet" });
  }

  // -------------------------------------------------------------------------
  // 3. Retrouver le paiement par référence marchand
  //    (merchantReferenceId = notre champ "reference" dans paiements)
  // -------------------------------------------------------------------------
  const { data: paiement, error: fetchError } = await supabaseAdmin
    .from("paiements")
    .select("id, statut, details")
    .eq("reference", merchantReferenceId)
    .maybeSingle();

  if (fetchError || !paiement) {
    console.error("[webhook] paiement introuvable:", merchantReferenceId, fetchError);
    // Répondre 200 pour éviter les re-tentatives PVIT sur une ref inconnue
    const ack: PvitWebhookAck = { transactionId, responseCode: code ?? 200 };
    return res.status(200).json(ack);
  }

  // Idempotence : ignorer si déjà terminal
  if (paiement.statut === "Validé" || paiement.statut === "Echoué") {
    const ack: PvitWebhookAck = { transactionId, responseCode: code ?? 200 };
    return res.status(200).json(ack);
  }

  // -------------------------------------------------------------------------
  // 4. Mapper statut PVIT → statut Ewuang
  // -------------------------------------------------------------------------
  const statutPaiement = status === "SUCCESS" ? "Validé" : "Echoué";

  await supabaseAdmin
    .from("paiements")
    .update({
      statut: statutPaiement,
      transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paiement.id);

  const details = paiement.details as {
    commande_id?: string;
    admin_id?: string;
    admin_frais?: number;
    boutique_benefices?: Record<string, number>;
  } | null;

  const commandeId = details?.commande_id;

  // -------------------------------------------------------------------------
  // 5a. SUCCESS → confirmer la commande + redistribuer les soldes
  // -------------------------------------------------------------------------
  if (statutPaiement === "Validé" && commandeId) {
    const { data: commande } = await supabaseAdmin
      .from("commandes")
      .select("id, numero, user_id")
      .eq("id", commandeId)
      .maybeSingle();

    if (commande) {
      await supabaseAdmin
        .from("commandes")
        .update({ statut: "En préparation", updated_at: new Date().toISOString() })
        .eq("id", commande.id);

      await supabaseAdmin.from("notifications").insert({
        user_id: commande.user_id,
        type: "commande",
        titre: "Paiement confirmé",
        message: `Votre commande ${commande.numero} a été payée avec succès. Elle est en cours de préparation.`,
        lu: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Redistribution des soldes
    if (details?.boutique_benefices) {
      for (const [userId, benefice] of Object.entries(details.boutique_benefices)) {
        if (benefice > 0) {
          await supabaseAdmin.rpc("increment_user_solde", {
            user_id: userId,
            amount: benefice,
          });
        }
      }
    }

    if (details?.admin_id && details?.admin_frais && details.admin_frais > 0) {
      await supabaseAdmin.rpc("increment_user_solde", {
        user_id: details.admin_id,
        amount: details.admin_frais,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 5b. FAILED → annuler la commande + restaurer le stock
  // -------------------------------------------------------------------------
  if (statutPaiement === "Echoué" && commandeId) {
    const { data: commande } = await supabaseAdmin
      .from("commandes")
      .select("id, numero, user_id")
      .eq("id", commandeId)
      .maybeSingle();

    if (commande) {
      await supabaseAdmin
        .from("commandes")
        .update({ statut: "Annulée", updated_at: new Date().toISOString() })
        .eq("id", commande.id);

      // Restaurer le stock des variations réservées
      const { data: articles } = await supabaseAdmin
        .from("commande_articles")
        .select("article_id, variation_id, quantite")
        .eq("commande_id", commande.id);

      if (articles) {
        for (const ca of articles) {
          if (ca.variation_id) {
            await supabaseAdmin.rpc("increment_variation_stock", {
              variation_id: ca.variation_id,
              quantity: ca.quantite,
            });
          } else {
            await supabaseAdmin.rpc("increment_article_stock", {
              article_id: ca.article_id,
              quantity: ca.quantite,
            });
          }
        }
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: commande.user_id,
        type: "commande",
        titre: "Paiement échoué",
        message: `Le paiement de votre commande ${commande.numero} a échoué. Veuillez réessayer.`,
        lu: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // -------------------------------------------------------------------------
  // 6. Accusé de réception PVIT (OBLIGATOIRE — ferme la boucle technique)
  // -------------------------------------------------------------------------
  const ack: PvitWebhookAck = { transactionId, responseCode: code ?? 200 };
  return res.status(200).json(ack);
}
