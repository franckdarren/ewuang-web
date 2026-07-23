// app/lib/soldeAdmin.ts
//
// Résolution du compte administrateur qui porte le SOLDE de la plateforme
// (frais de service encaissés sur chaque paiement, contre-passations lors des
// remboursements).
//
// Règle métier : le solde est porté par l'admin OPÉRATIONNEL, jamais par le
// Super Admin (compte système, admin_roles.is_system = true). Ce dernier ne
// doit accumuler aucun solde.
//
// Historiquement le code résolvait « le » compte via
// `.eq("role","Administrateur").single()`, ce qui casse dès qu'il existe
// plusieurs comptes Administrateur. On sélectionne désormais explicitement
// l'admin non-système le plus ancien.

import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Renvoie l'id du compte administrateur porteur du solde (admin opérationnel,
 * rôle admin non-système), ou null si aucun n'existe.
 */
export async function resolveSoldeAdminId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, created_at, admin_roles(is_system)")
    .eq("role", "Administrateur")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[resolveSoldeAdminId] Erreur select users:", error);
    return null;
  }

  const operationnel = (data ?? []).find(
    (u) => !(u.admin_roles as { is_system?: boolean } | null)?.is_system,
  );

  return operationnel?.id ?? null;
}
