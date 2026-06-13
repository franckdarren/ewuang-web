// app/lib/finalizePaiement.ts
//
// Logique de finalisation d'un paiement (Validé / Echoué).
// Utilisée à la fois par le webhook PVIT et par l'endpoint de polling de statut,
// afin que les deux chemins produisent exactement les mêmes effets de bord.

import { supabaseAdmin } from "./supabaseAdmin";

export interface PaiementDetails {
  commande_id?: string | null;
  admin_id?: string | null;
  admin_frais?: number;
  boutique_benefices?: Record<string, number>;
  operateur?: string;
  telephone?: string;
}

/**
 * Restaure le stock réservé d'une commande (variations et articles simples).
 * Idempotent : il n'y a pas de double restauration tant que l'appelant ne
 * réinvoque pas cette fonction sur la même commande.
 */
export async function restoreStockForCommande(commandeId: string): Promise<void> {
  const { data: articles } = await supabaseAdmin
    .from("commande_articles")
    .select("article_id, variation_id, quantite")
    .eq("commande_id", commandeId);

  if (!articles) return;

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

// Extrait la ville depuis une adresse de livraison
function extractVille(adresse: string): string {
  const a = adresse.toLowerCase();
  const villes = [
    "libreville", "port-gentil", "franceville", "oyem", "moanda",
    "mouila", "lambaréné", "lambarene", "tchibanga", "koulamoutou",
    "makokou", "akanda", "owendo", "ntoum",
  ];
  for (const v of villes) {
    if (a.includes(v)) return v.charAt(0).toUpperCase() + v.slice(1);
  }
  // Dernier segment après la dernière virgule, sinon l'adresse complète
  const parts = adresse.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? adresse;
}

/**
 * Finalise un paiement Validé : passe la commande en "En préparation",
 * crée automatiquement la livraison si isLivrable, crédite les boutiques
 * et l'admin, notifie le client.
 *
 * Le statut du paiement lui-même doit être mis à jour par l'appelant
 * (typiquement en amont, avec transaction_id, etc.).
 */
export async function finalizePaiementValide(
  details: PaiementDetails | null,
): Promise<void> {
  const commandeId = details?.commande_id;
  if (!commandeId) return;

  const { data: commande } = await supabaseAdmin
    .from("commandes")
    .select("id, numero, user_id, statut, isLivrable, adresse_livraison")
    .eq("id", commandeId)
    .maybeSingle();

  if (!commande) return;

  // Idempotence : si déjà "En préparation" (ou plus avancée), on ne refait rien
  if (commande.statut !== "En attente") return;

  // Créer automatiquement la livraison si la commande est livrable
  if (commande.isLivrable) {
    // Vérifier qu'il n'en existe pas déjà une (idempotence)
    const { data: livraisonExistante } = await supabaseAdmin
      .from("livraisons")
      .select("id")
      .eq("commande_id", commande.id)
      .maybeSingle();

    if (!livraisonExistante) {
      // Récupérer le téléphone du client
      const { data: client } = await supabaseAdmin
        .from("users")
        .select("phone")
        .eq("id", commande.user_id)
        .maybeSingle();

      const adresse: string = commande.adresse_livraison ?? "";
      const ville = extractVille(adresse);

      // Date de livraison par défaut : J+3
      const dateLivraison = new Date();
      dateLivraison.setDate(dateLivraison.getDate() + 3);

      await supabaseAdmin.from("livraisons").insert({
        commande_id: commande.id,
        user_id: commande.user_id,
        livreur_id: null,
        adresse,
        ville,
        phone: client?.phone ?? "",
        date_livraison: dateLivraison.toISOString(),
        statut: "En attente",
        details: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Commande toujours en préparation après paiement — la boutique la passera
  // manuellement en "Prête pour livraison" une fois prête, ce qui déclenchera
  // la notification aux livreurs.
  await supabaseAdmin
    .from("commandes")
    .update({ statut: "En préparation", updated_at: new Date().toISOString() })
    .eq("id", commande.id);

  await supabaseAdmin.from("notifications").insert({
    user_id: commande.user_id,
    type: "Commande",
    titre: "Paiement confirmé",
    message: `Votre commande ${commande.numero} a été payée avec succès. Elle est en cours de préparation.`,
    is_read: false,
    created_at: new Date().toISOString(),
  });

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

/**
 * Finalise un paiement Echoué : passe la commande en "Annulée",
 * restaure le stock réservé, notifie le client.
 */
export async function finalizePaiementEchoue(
  details: PaiementDetails | null,
): Promise<void> {
  const commandeId = details?.commande_id;
  if (!commandeId) return;

  const { data: commande } = await supabaseAdmin
    .from("commandes")
    .select("id, numero, user_id, statut")
    .eq("id", commandeId)
    .maybeSingle();

  if (!commande) return;

  // Idempotence : si déjà "Annulée", on ne restaure pas le stock une 2e fois
  if (commande.statut === "Annulée") return;

  await supabaseAdmin
    .from("commandes")
    .update({ statut: "Annulée", updated_at: new Date().toISOString() })
    .eq("id", commande.id);

  await restoreStockForCommande(commande.id);

  await supabaseAdmin.from("notifications").insert({
    user_id: commande.user_id,
    type: "Commande",
    titre: "Paiement échoué",
    message: `Le paiement de votre commande ${commande.numero} a échoué. Veuillez réessayer.`,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}
