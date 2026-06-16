// app/lib/remboursement.ts
//
// Logique métier du workflow de remboursement.
//
// declencherRemboursement() est appelée quand un administrateur VALIDE
// définitivement une demande de remboursement. Effets :
//   1. Marque le paiement "Remboursée"
//   2. Marque la commande "Remboursée"
//   3. Contre-passe les soldes crédités lors du paiement (bénéfices des
//      boutiques + frais de l'admin) — l'argent encaissé est annulé en
//      comptabilité interne.
//   4. Notifie le client.
//
// ⚠️ Transfert effectif de l'argent au client : pour l'instant le système
// marque seulement le remboursement (l'admin reverse manuellement via mobile
// money). Le point d'extension `pvitPayout` ci-dessous est prêt pour une
// automatisation future dès que l'API payout PVIT sera disponible/documentée.

import { supabaseAdmin } from "./supabaseAdmin";
import type { PaiementDetails } from "./finalizePaiement";

export interface DeclencherRemboursementResult {
  ok: boolean;
  error?: string;
}

/**
 * Déclenche le remboursement d'une demande validée par l'admin.
 * Idempotent : si la demande est déjà "Remboursée", ne refait rien.
 */
export async function declencherRemboursement(
  remboursementId: string,
): Promise<DeclencherRemboursementResult> {
  // 1. Charger la demande
  const { data: rb, error: rbError } = await supabaseAdmin
    .from("remboursements")
    .select("id, statut, commande_id, paiement_id, user_id, montant")
    .eq("id", remboursementId)
    .maybeSingle();

  if (rbError || !rb) {
    return { ok: false, error: "Demande de remboursement introuvable" };
  }

  // Idempotence
  if (rb.statut === "Remboursée") {
    return { ok: true };
  }

  // 2. Charger la commande
  const { data: commande } = await supabaseAdmin
    .from("commandes")
    .select("id, numero, statut, user_id")
    .eq("id", rb.commande_id)
    .maybeSingle();

  if (!commande) {
    return { ok: false, error: "Commande introuvable" };
  }

  // 3. Charger le paiement (pour contre-passer les soldes)
  let details: PaiementDetails | null = null;
  if (rb.paiement_id) {
    const { data: paiement } = await supabaseAdmin
      .from("paiements")
      .select("id, statut, details")
      .eq("id", rb.paiement_id)
      .maybeSingle();

    if (paiement) {
      details = (paiement.details as PaiementDetails | null) ?? null;

      // Marquer le paiement Remboursée (sauf s'il l'est déjà)
      if (paiement.statut !== "Remboursée") {
        await supabaseAdmin
          .from("paiements")
          .update({ statut: "Remboursée", updated_at: new Date().toISOString() })
          .eq("id", paiement.id);
      }
    }
  }

  // 4. Contre-passer les soldes crédités au paiement initial
  if (details?.boutique_benefices) {
    for (const [userId, benefice] of Object.entries(details.boutique_benefices)) {
      if (benefice > 0) {
        await supabaseAdmin.rpc("decrement_user_solde", {
          user_id: userId,
          amount: benefice,
        });
      }
    }
  }
  if (details?.admin_id && details?.admin_frais && details.admin_frais > 0) {
    await supabaseAdmin.rpc("decrement_user_solde", {
      user_id: details.admin_id,
      amount: details.admin_frais,
    });
  }

  // 5. Marquer la commande Remboursée
  await supabaseAdmin
    .from("commandes")
    .update({ statut: "Remboursée", updated_at: new Date().toISOString() })
    .eq("id", commande.id);

  // 6. (Point d'extension) Transfert effectif au client via PVIT payout.
  //    À activer dès que l'API payout PVIT est disponible :
  //    await pvitPayout({ amount: rb.montant, customerAccountNumber, ... });

  // 7. Notifier le client
  await supabaseAdmin.from("notifications").insert({
    user_id: rb.user_id,
    type: "Commande",
    titre: "Remboursement validé",
    message: `Votre remboursement de ${rb.montant} FCFA pour la commande ${commande.numero} a été validé. Le versement vous parviendra sous peu.`,
    lien: `/remboursements/${rb.id}`,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  return { ok: true };
}
