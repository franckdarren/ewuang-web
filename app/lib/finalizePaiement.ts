// app/lib/finalizePaiement.ts
//
// Logique de finalisation d'un paiement (Validé / Echoué).
// Utilisée à la fois par le webhook PVIT et par l'endpoint de polling de statut,
// afin que les deux chemins produisent exactement les mêmes effets de bord.
//
// Multi-boutiques (Option A) : un paiement référence désormais un GROUPE
// (commande_groupes) qui contient N sous-commandes, une par boutique. La
// finalisation boucle sur toutes les sous-commandes du groupe.
// Rétrocompatibilité : si details ne contient qu'un ancien commande_id
// (paiement initié avant la migration), on traite cette commande unique.

import { supabaseAdmin } from "./supabaseAdmin";

export interface PaiementDetails {
  groupe_id?: string | null;
  commande_id?: string | null; // legacy (paiements d'avant la migration)
  admin_id?: string | null;
  admin_frais?: number;
  boutique_benefices?: Record<string, number>;
  operateur?: string;
  telephone?: string;
}

interface CommandeFinalisable {
  id: string;
  numero: string;
  user_id: string;
  statut: string;
  isLivrable: boolean;
  adresse_livraison: string | null;
  telephone_livraison: string | null;
}

const COMMANDE_FIELDS =
  "id, numero, user_id, statut, isLivrable, adresse_livraison, telephone_livraison";

/**
 * Résout la liste des (sous-)commandes concernées par un paiement, à partir
 * du groupe_id (nouveau modèle) ou du commande_id (legacy).
 */
async function resolveCommandes(
  details: PaiementDetails | null,
): Promise<CommandeFinalisable[]> {
  if (details?.groupe_id) {
    const { data } = await supabaseAdmin
      .from("commandes")
      .select(COMMANDE_FIELDS)
      .eq("groupe_id", details.groupe_id);
    return (data as CommandeFinalisable[] | null) ?? [];
  }

  if (details?.commande_id) {
    const { data } = await supabaseAdmin
      .from("commandes")
      .select(COMMANDE_FIELDS)
      .eq("id", details.commande_id)
      .maybeSingle();
    return data ? [data as CommandeFinalisable] : [];
  }

  return [];
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
 * Crée la livraison d'une sous-commande livrable, si elle n'existe pas déjà.
 * Une livraison par (sous-)commande = un point de retrait par boutique.
 */
async function creerLivraisonPourCommande(c: CommandeFinalisable): Promise<void> {
  if (!c.isLivrable) return;

  const { data: livraisonExistante } = await supabaseAdmin
    .from("livraisons")
    .select("id")
    .eq("commande_id", c.id)
    .maybeSingle();

  if (livraisonExistante) return;

  const adresse: string = c.adresse_livraison ?? "";
  const ville = extractVille(adresse);

  // Priorité : numéro de contact livraison saisi au checkout,
  // sinon fallback sur le téléphone du profil utilisateur
  let phoneContact: string = c.telephone_livraison ?? "";
  if (!phoneContact) {
    const { data: client } = await supabaseAdmin
      .from("users")
      .select("phone")
      .eq("id", c.user_id)
      .maybeSingle();
    phoneContact = client?.phone ?? "";
  }

  // Date de livraison par défaut : J+3
  const dateLivraison = new Date();
  dateLivraison.setDate(dateLivraison.getDate() + 3);

  await supabaseAdmin.from("livraisons").insert({
    commande_id: c.id,
    user_id: c.user_id,
    livreur_id: null,
    adresse,
    ville,
    phone: phoneContact,
    date_livraison: dateLivraison.toISOString(),
    statut: "En attente",
    details: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Finalise un paiement Validé : passe chaque sous-commande du groupe en
 * "En préparation", crée automatiquement une livraison par sous-commande
 * livrable, crédite les boutiques et l'admin, notifie le client.
 *
 * Idempotent : ne traite que les sous-commandes encore "En attente". Si aucune
 * ne l'est (paiement déjà finalisé), aucun effet de bord n'est rejoué.
 *
 * Le statut du paiement lui-même doit être mis à jour par l'appelant.
 */
export async function finalizePaiementValide(
  details: PaiementDetails | null,
): Promise<void> {
  const commandes = await resolveCommandes(details);
  if (commandes.length === 0) return;

  const aTraiter = commandes.filter((c) => c.statut === "En attente");
  // Idempotence : si rien à traiter, le paiement est déjà finalisé.
  if (aTraiter.length === 0) return;

  for (const c of aTraiter) {
    await creerLivraisonPourCommande(c);

    // La boutique passera manuellement sa sous-commande en "Prête pour
    // livraison" une fois prête, ce qui notifiera les livreurs.
    await supabaseAdmin
      .from("commandes")
      .update({ statut: "En préparation", updated_at: new Date().toISOString() })
      .eq("id", c.id);
  }

  // Créditer chaque boutique de sa part (map par boutique = par sous-commande).
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

  // Créditer l'admin de ses frais (une seule fois pour tout le groupe).
  if (details?.admin_id && details?.admin_frais && details.admin_frais > 0) {
    await supabaseAdmin.rpc("increment_user_solde", {
      user_id: details.admin_id,
      amount: details.admin_frais,
    });
  }

  // Une seule notification client au niveau du groupe.
  const numeroClient = await resolveNumeroGroupe(details, aTraiter[0].numero);
  await supabaseAdmin.from("notifications").insert({
    user_id: aTraiter[0].user_id,
    type: "Commande",
    titre: "Paiement confirmé",
    message: `Votre commande ${numeroClient} a été payée avec succès. Elle est en cours de préparation.`,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

/**
 * Finalise un paiement Echoué : passe chaque sous-commande du groupe en
 * "Annulée", restaure le stock réservé, notifie le client.
 *
 * Idempotent : ne traite que les sous-commandes pas encore "Annulée".
 */
export async function finalizePaiementEchoue(
  details: PaiementDetails | null,
): Promise<void> {
  const commandes = await resolveCommandes(details);
  if (commandes.length === 0) return;

  const aTraiter = commandes.filter((c) => c.statut !== "Annulée");
  if (aTraiter.length === 0) return;

  for (const c of aTraiter) {
    await supabaseAdmin
      .from("commandes")
      .update({ statut: "Annulée", updated_at: new Date().toISOString() })
      .eq("id", c.id);

    await restoreStockForCommande(c.id);
  }

  const numeroClient = await resolveNumeroGroupe(details, aTraiter[0].numero);
  await supabaseAdmin.from("notifications").insert({
    user_id: aTraiter[0].user_id,
    type: "Commande",
    titre: "Paiement échoué",
    message: `Le paiement de votre commande ${numeroClient} a échoué. Veuillez réessayer.`,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

/**
 * Renvoie le numéro parent du groupe (pour les messages client), avec repli
 * sur le numéro de la sous-commande (cas legacy sans groupe).
 */
async function resolveNumeroGroupe(
  details: PaiementDetails | null,
  fallbackNumero: string,
): Promise<string> {
  if (details?.groupe_id) {
    const { data: groupe } = await supabaseAdmin
      .from("commande_groupes")
      .select("numero")
      .eq("id", details.groupe_id)
      .maybeSingle();
    if (groupe?.numero) return groupe.numero;
  }
  return fallbackNumero;
}
