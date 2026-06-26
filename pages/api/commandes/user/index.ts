// pages/api/commandes/user/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/user:
 *   get:
 *     summary: Liste les commandes d'un utilisateur (groupées par panier)
 *     description: >
 *       Récupère les commandes de l'utilisateur connecté, regroupées par
 *       "groupe parent" (un panier payé en une fois). Chaque groupe contient
 *       une ou plusieurs sous-commandes, une par boutique, avec leur statut et
 *       leur livraison propres. Les commandes anciennes sans groupe sont
 *       renvoyées comme des groupes mono-commande.
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *         description: >
 *           Filtre : ne garde que les groupes contenant au moins une
 *           sous-commande à ce statut (libellé FR, ex. "En préparation").
 *     responses:
 *       200:
 *         description: Liste des groupes de commandes de l'utilisateur
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const SOUS_COMMANDE_SELECT = `
  *,
  commande_articles (
    *,
    articles (id, nom, prix, image_principale, categorie_id),
    variations (id, couleur, taille)
  ),
  livraisons (*)
`;

// Statuts terminaux d'une sous-commande
const STATUTS_TERMINAUX = new Set(["Livrée", "Annulée", "Remboursée"]);

/**
 * Calcule un statut "vue d'ensemble" pour un groupe à partir des statuts de
 * ses sous-commandes. Si toutes identiques → ce statut. Si toutes terminales
 * mais différentes → "Terminée". Sinon (mélange en cours) → "En cours".
 */
function deriveStatutGroupe(statuts: string[]): string {
  if (statuts.length === 0) return "En attente";
  const uniq = [...new Set(statuts)];
  if (uniq.length === 1) return uniq[0];
  if (uniq.every((s) => STATUTS_TERMINAUX.has(s))) return "Terminée";
  return "En cours";
}

interface Conteneur {
  id: string;
  numero: string;
  prix_total: number;
  frais_livraison: number;
  ville_livraison: string | null;
  adresse_livraison: string | null;
  telephone_livraison: string | null;
  commentaire: string | null;
  created_at: string;
  statut_global: string;
  is_legacy: boolean;
  sous_commandes: any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const statut = req.query.statut as string | undefined;
    const offset = (page - 1) * limit;

    // 1. Groupes parents de l'utilisateur, avec leurs sous-commandes embarquées.
    const { data: groupes, error: groupesError } = await supabaseAdmin
      .from("commande_groupes")
      .select(`
        id, numero, prix_total, frais_livraison, ville_livraison,
        adresse_livraison, telephone_livraison, commentaire, created_at,
        commandes ( ${SOUS_COMMANDE_SELECT} )
      `)
      .eq("user_id", profile.id);

    if (groupesError) {
      console.error("Supabase error (groupes):", groupesError);
      return res.status(500).json({ error: "Impossible de récupérer les commandes" });
    }

    // 2. Commandes orphelines (sans groupe : anciennes données ou créées par
    //    une boutique) — renvoyées comme groupes mono-commande pour ne rien
    //    masquer tant que la migration rétroactive n'a pas tourné.
    const { data: orphelines, error: orphError } = await supabaseAdmin
      .from("commandes")
      .select(SOUS_COMMANDE_SELECT)
      .eq("user_id", profile.id)
      .is("groupe_id", null);

    if (orphError) {
      console.error("Supabase error (orphelines):", orphError);
      return res.status(500).json({ error: "Impossible de récupérer les commandes" });
    }

    // 3. Construire une liste unifiée de conteneurs.
    const conteneurs: Conteneur[] = [];

    for (const g of groupes ?? []) {
      const sousCommandes = ((g as any).commandes ?? []) as any[];
      conteneurs.push({
        id: g.id,
        numero: g.numero,
        prix_total: g.prix_total,
        frais_livraison: g.frais_livraison,
        ville_livraison: g.ville_livraison ?? null,
        adresse_livraison: g.adresse_livraison ?? null,
        telephone_livraison: g.telephone_livraison ?? null,
        commentaire: g.commentaire ?? null,
        created_at: g.created_at,
        statut_global: deriveStatutGroupe(sousCommandes.map((c) => c.statut)),
        is_legacy: false,
        sous_commandes: sousCommandes,
      });
    }

    for (const c of orphelines ?? []) {
      conteneurs.push({
        id: c.id,
        numero: c.numero,
        prix_total: c.prix,
        frais_livraison: 0,
        ville_livraison: null,
        adresse_livraison: c.adresse_livraison ?? null,
        telephone_livraison: c.telephone_livraison ?? null,
        commentaire: c.commentaire ?? null,
        created_at: c.created_at,
        statut_global: c.statut,
        is_legacy: true,
        sous_commandes: [c],
      });
    }

    // 4. Filtre optionnel par statut (groupe gardé s'il a une sous-commande à ce statut).
    let filtres = conteneurs;
    if (statut) {
      filtres = conteneurs.filter((g) =>
        g.sous_commandes.some((c) => c.statut === statut)
      );
    }

    // 5. Tri par date décroissante puis pagination en mémoire.
    filtres.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const total = filtres.length;
    const totalPages = Math.ceil(total / limit) || 0;
    const pageItems = filtres.slice(offset, offset + limit);

    return res.status(200).json({
      groupes: pageItems,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error("Error /api/commandes/user:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
