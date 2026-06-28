// pages/api/paiements/initiate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { pvitInitiatePaiement, toOperateurCode } from "../../../app/lib/pvit";

/**
 * @swagger
 * /api/paiements/initiate:
 *   post:
 *     summary: Initie un paiement PVIT pour une commande
 *     description: >
 *       Crée la commande (En attente), réserve le stock, crée un paiement (en_attente),
 *       puis appelle PVIT. Le client reçoit le status PENDING — la confirmation finale
 *       arrive via le webhook /api/paiements/webhook.
 *     tags:
 *       - Paiements
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operateur
 *               - telephone
 *               - isLivrable
 *               - adresse_livraison
 *               - articles
 *             properties:
 *               operateur:
 *                 type: string
 *                 enum: [airtel_money, moov_money, visa_mastercard]
 *               telephone:
 *                 type: string
 *                 description: Numéro MSISDN du client pour le paiement mobile money (ex: 077XXXXXXX)
 *               telephone_livraison:
 *                 type: string
 *                 description: Numéro de contact pour la livraison (peut différer du numéro de paiement)
 *               isLivrable:
 *                 type: boolean
 *               adresse_livraison:
 *                 type: string
 *               commentaire:
 *                 type: string
 *               code_promo:
 *                 type: string
 *               zone_livraison_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de la zone choisie par le client dans la liste déroulante. Optionnel ; à défaut, le serveur détecte la zone via l'adresse.
 *               articles:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [article_id, quantite]
 *                   properties:
 *                     article_id:
 *                       type: string
 *                       format: uuid
 *                     variation_id:
 *                       type: string
 *                       format: uuid
 *                     quantite:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Paiement initié (PENDING) — attendre le webhook
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const initiateSchema = z.object({
  operateur: z.enum(["airtel_money", "moov_money", "visa_mastercard"]),
  telephone: z.string().min(5),
  telephone_livraison: z.string().min(5).optional(),
  isLivrable: z.boolean(),
  adresse_livraison: z.string().max(255),
  commentaire: z.string().optional().default(""),
  code_promo: z.string().optional(),
  zone_livraison_id: z.string().uuid().optional(),
  articles: z
    .array(
      z.object({
        article_id: z.string().uuid(),
        variation_id: z.string().uuid().optional(),
        quantite: z.number().int().min(1),
      })
    )
    .min(1),
});

/**
 * Calcule le tarif de livraison à partir de la table zones_livraison.
 * Stratégie :
 *  1. Si zone_livraison_id est fourni → on l'utilise (zone choisie par le client dans la dropdown).
 *  2. Sinon, on cherche une zone active dont le nom est contenu dans l'adresse.
 *  3. Sinon, on prend la zone marquée is_default.
 * Retourne { tarif, ville } pour traçabilité.
 */
async function resolveFraisLivraison(
  zoneId: string | undefined,
  adresse: string
): Promise<{ tarif: number; ville: string }> {
  if (zoneId) {
    const { data: zone } = await supabaseAdmin
      .from("zones_livraison")
      .select("ville, tarif, is_active")
      .eq("id", zoneId)
      .maybeSingle();
    if (zone && zone.is_active) return { tarif: zone.tarif, ville: zone.ville };
  }

  const { data: zones } = await supabaseAdmin
    .from("zones_livraison")
    .select("ville, tarif, is_default")
    .eq("is_active", true);

  const adresseLower = adresse.toLowerCase();
  const matched = zones?.find(
    z => !z.is_default && adresseLower.includes(z.ville.toLowerCase())
  );
  if (matched) return { tarif: matched.tarif, ville: matched.ville };

  const fallback = zones?.find(z => z.is_default);
  if (fallback) return { tarif: fallback.tarif, ville: fallback.ville };

  // Filet de sécurité si la table est vide
  return { tarif: 3000, ville: "Autres villes" };
}

/**
 * Normalise un numéro de téléphone gabonais au format local attendu par PVIT.
 * Exemple doc PVIT : "066666666" (9 chiffres, format local avec 0 initial).
 * Accepte : "077 XX XX XX", "+24177XXXXXX", "24177XXXXXX", "77XXXXXX", "077XXXXXX".
 * Retourne : "0XXXXXXXX" (9 chiffres).
 * Préfixes Airtel : 07, 77, 74, 76 — Préfixes Moov : 06, 62, 65, 66.
 */
function normalizeGabonLocalNumber(
  raw: string,
  operateur: "airtel_money" | "moov_money" | "visa_mastercard"
): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("241")) digits = digits.slice(3);

  // Ajouter le "0" initial s'il manque (format local gabonais : 9 chiffres)
  if (!digits.startsWith("0")) digits = "0" + digits;

  if (digits.length !== 9) {
    throw new Error(
      `Numéro invalide : 9 chiffres attendus (ex: 077XXXXXX), reçu ${digits.length}`
    );
  }

  const airtelPrefixes = ["07", "77", "74", "76"];
  const moovPrefixes = ["06", "62", "65", "66"];

  // Le préfixe se lit sur les 2 premiers chiffres après le "0" trunk (positions 1-2),
  // OU directement les positions 0-1 si le préfixe inclut le "0" (ex: "07").
  const prefixWithZero = digits.slice(0, 2);
  const prefixWithoutZero = digits.slice(1, 3);
  const validForOperator =
    operateur === "airtel_money"
      ? airtelPrefixes.includes(prefixWithZero) ||
        airtelPrefixes.includes(prefixWithoutZero)
      : operateur === "moov_money"
      ? moovPrefixes.includes(prefixWithZero) ||
        moovPrefixes.includes(prefixWithoutZero)
      : false;

  if (!validForOperator) {
    const expected = operateur === "airtel_money" ? "07/77/74/76" : "06/62/65/66";
    throw new Error(
      `Numéro ${digits} incompatible avec l'opérateur sélectionné (préfixes attendus : ${expected})`
    );
  }

  return digits;
}

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${yearShort}${month}${day}`;

  const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

  const { count, error } = await supabaseAdmin
    .from("commandes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) return `E-${datePart}-${Date.now().toString().slice(-3)}`;

  const nextNumber = (count || 0) + 1;
  return `E-${datePart}-${String(nextNumber).padStart(3, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const body = initiateSchema.parse(req.body);

    // Normaliser le téléphone pour PVIT (mobile money uniquement)
    let telephonePvit = body.telephone;
    if (body.operateur !== "visa_mastercard") {
      try {
        telephonePvit = normalizeGabonLocalNumber(body.telephone, body.operateur);
      } catch (e) {
        return res
          .status(400)
          .json({ error: e instanceof Error ? e.message : "Téléphone invalide" });
      }
    }

    // -----------------------------------------------------------------------
    // 1. Valider les articles et calculer les montants
    // -----------------------------------------------------------------------
    let total = 0;
    let adminFrais = 0;
    const boutiqueIds: string[] = [];
    const commandeArticles: {
      article_id: string;
      variation_id: string | null;
      quantite: number;
      prix_unitaire: number;
      boutique_user_id: string;
      benefice: number;
      variation_to_update: { id: string; quantite: number } | null;
      article_to_update: { id: string; quantite: number } | null;
    }[] = [];

    const { data: admin } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "Administrateur")
      .single();

    for (const item of body.articles) {
      const { data: article, error: articleError } = await supabaseAdmin
        .from("articles")
        .select("id, prix, prix_promotion, is_promotion, stock, user_id, variations(id, stock)")
        .eq("id", item.article_id)
        .single();

      if (articleError || !article) {
        return res.status(400).json({ error: `Article ${item.article_id} introuvable` });
      }

      boutiqueIds.push(article.user_id);

      const prixUnitaire = article.is_promotion ? article.prix_promotion : article.prix;
      let variation: { id: string; stock: number } | null = null;

      if (item.variation_id) {
        variation = article.variations?.find((v: any) => v.id === item.variation_id) ?? null;
        if (!variation) {
          return res.status(400).json({ error: `Variation ${item.variation_id} introuvable` });
        }
        if (variation.stock < item.quantite) {
          return res.status(400).json({ error: `Stock insuffisant pour la variation ${variation.id}` });
        }
      } else {
        // Article sans variation : vérifier le stock au niveau article
        if (article.stock < item.quantite) {
          return res.status(400).json({ error: `Stock insuffisant pour l'article ${item.article_id}` });
        }
      }

      const sousTotal = prixUnitaire * item.quantite;
      total += sousTotal;

      let frais = 0;
      if (prixUnitaire < 15000) frais = 300 * item.quantite;
      else if (prixUnitaire < 50000) frais = 500 * item.quantite;
      else frais = 1000 * item.quantite;

      adminFrais += frais;

      commandeArticles.push({
        article_id: item.article_id,
        variation_id: item.variation_id ?? null,
        quantite: item.quantite,
        prix_unitaire: prixUnitaire,
        boutique_user_id: article.user_id,
        benefice: sousTotal - frais,
        variation_to_update: variation ? { id: variation.id, quantite: item.quantite } : null,
        article_to_update: !variation ? { id: item.article_id, quantite: item.quantite } : null,
      });
    }

    // -----------------------------------------------------------------------
    // 2. Code promo
    // -----------------------------------------------------------------------
    let remiseAppliquee = 0;
    let codePromoId: string | null = null;

    if (body.code_promo) {
      const sousTotal = commandeArticles.reduce(
        (sum, ca) => sum + ca.prix_unitaire * ca.quantite,
        0
      );

      const { data: promo } = await supabaseAdmin
        .from("codes_promo")
        .select("*")
        .eq("code", body.code_promo.toUpperCase())
        .eq("est_actif", true)
        .single();

      if (!promo) return res.status(400).json({ error: "Code promo invalide" });
      if (promo.date_expiration && new Date(promo.date_expiration) < new Date()) {
        return res.status(400).json({ error: "Ce code promo a expiré" });
      }
      if (
        promo.utilisations_max !== null &&
        promo.utilisations_actuelles >= promo.utilisations_max
      ) {
        return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation" });
      }
      if (promo.article_id && !body.articles.some((a) => a.article_id === promo.article_id)) {
        return res.status(400).json({ error: "Ce code promo ne s'applique pas à vos articles" });
      }
      if (sousTotal < promo.montant_min) {
        return res.status(400).json({ error: `Montant minimum requis : ${promo.montant_min} FCFA` });
      }

      remiseAppliquee =
        promo.type === "pourcentage"
          ? Math.round(sousTotal * (promo.valeur / 100))
          : Math.min(promo.valeur, sousTotal);

      codePromoId = promo.id;
      total -= remiseAppliquee;
      if (total < 0) total = 0;
    }

    // -----------------------------------------------------------------------
    // 3. Frais de livraison (uniquement si livraison demandée)
    //    Tarif unique par commande, lu dans la table zones_livraison.
    // -----------------------------------------------------------------------
    let fraisLivraison = 0;
    let villeLivraison: string | null = null;
    if (body.isLivrable) {
      const zone = await resolveFraisLivraison(
        body.zone_livraison_id,
        body.adresse_livraison
      );
      fraisLivraison = zone.tarif;
      villeLivraison = zone.ville;
      total += fraisLivraison;
    }

    // -----------------------------------------------------------------------
    // 4. Créer l'enregistrement paiement en premier (requis par les FK paiement_id)
    // -----------------------------------------------------------------------
    const paiementId = uuidv4();
    const numeroCommande = await generateOrderNumber();

    // Référence unique envoyée à PVIT — MAX 15 CARACTÈRES (contrainte PVIT)
    const reference = randomBytes(8).toString("hex").toUpperCase().slice(0, 15);

    const boutiqueBenefices = commandeArticles.reduce(
      (acc, ca) => {
        acc[ca.boutique_user_id] = (acc[ca.boutique_user_id] ?? 0) + ca.benefice;
        return acc;
      },
      {} as Record<string, number>
    );

    const paiementDetails = {
      groupe_id: null as string | null, // renseigné après création du groupe
      operateur: body.operateur,
      telephone: body.telephone,
      admin_id: admin?.id ?? null,
      admin_frais: adminFrais,
      boutique_benefices: boutiqueBenefices,
      frais_livraison: fraisLivraison,
      ville_livraison: villeLivraison,
    };

    const { error: paiementError } = await supabaseAdmin.from("paiements").insert({
      id: paiementId,
      user_id: profile.id,
      montant: total,
      methode: "mobile_money",
      statut: "En attente",
      reference,
      details: paiementDetails,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (paiementError) {
      console.error("[paiements/initiate] paiement insert:", paiementError);
      return res.status(500).json({ error: "Impossible de créer le paiement" });
    }

    // -----------------------------------------------------------------------
    // 5. Créer le groupe parent (payé en une fois par le client), puis une
    //    sous-commande par boutique (Option A multi-boutiques).
    // -----------------------------------------------------------------------
    const groupeId = uuidv4();
    const { error: groupeError } = await supabaseAdmin
      .from("commande_groupes")
      .insert({
        id: groupeId,
        numero: numeroCommande,
        user_id: profile.id,
        paiement_id: paiementId,
        prix_total: total,
        frais_livraison: fraisLivraison,
        ville_livraison: villeLivraison,
        adresse_livraison: body.adresse_livraison,
        telephone_livraison: body.telephone_livraison ?? null,
        commentaire: body.commentaire,
        code_promo_id: codePromoId,
        remise_appliquee: remiseAppliquee,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (groupeError) {
      console.error("[paiements/initiate] groupe insert:", groupeError);
      await supabaseAdmin.from("paiements").delete().eq("id", paiementId);
      return res.status(500).json({ error: "Impossible de créer la commande" });
    }

    // Regrouper les articles par boutique (1 sous-commande = 1 boutique)
    const articlesParBoutique = new Map<string, typeof commandeArticles>();
    for (const ca of commandeArticles) {
      const list = articlesParBoutique.get(ca.boutique_user_id) ?? [];
      list.push(ca);
      articlesParBoutique.set(ca.boutique_user_id, list);
    }

    // Rollback : supprime sous-commandes, groupe, puis paiement (ordre FK).
    const sousCommandeIds: string[] = [];
    const rollbackCommandes = async () => {
      for (const scid of sousCommandeIds) {
        await supabaseAdmin.from("commande_articles").delete().eq("commande_id", scid);
        await supabaseAdmin.from("commandes").delete().eq("id", scid);
      }
      await supabaseAdmin.from("commande_groupes").delete().eq("id", groupeId);
      await supabaseAdmin.from("paiements").delete().eq("id", paiementId);
    };

    let lettreIndex = 0;
    for (const [boutiqueId, items] of articlesParBoutique) {
      const lettre = String.fromCharCode(65 + lettreIndex); // A, B, C...
      lettreIndex++;
      const prixBoutique = items.reduce(
        (sum, ca) => sum + ca.prix_unitaire * ca.quantite,
        0
      );

      const { data: sousCommande, error: commandeError } = await supabaseAdmin
        .from("commandes")
        .insert({
          numero: `${numeroCommande}-${lettre}`,
          user_id: profile.id,
          vendeur_id: boutiqueId,
          groupe_id: groupeId,
          commentaire: body.commentaire,
          statut: "En attente",
          isLivrable: body.isLivrable,
          prix: prixBoutique,
          adresse_livraison: body.adresse_livraison,
          telephone_livraison: body.telephone_livraison ?? null,
          // Promo portée au niveau du groupe (prix_total) ; on garde la
          // référence pour la traçabilité sans rejouer la remise par boutique.
          code_promo_id: codePromoId,
          remise_appliquee: 0,
          paiement_id: paiementId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (commandeError || !sousCommande) {
        console.error("[paiements/initiate] sous-commande insert:", commandeError);
        await rollbackCommandes();
        return res.status(500).json({ error: "Impossible de créer la commande" });
      }

      sousCommandeIds.push(sousCommande.id);

      const { error: articlesError } = await supabaseAdmin
        .from("commande_articles")
        .insert(
          items.map((ca) => ({
            commande_id: sousCommande.id,
            article_id: ca.article_id,
            variation_id: ca.variation_id,
            quantite: ca.quantite,
            prix_unitaire: ca.prix_unitaire,
          }))
        );

      if (articlesError) {
        console.error("[paiements/initiate] articles insert:", articlesError);
        await rollbackCommandes();
        return res.status(500).json({ error: "Impossible d'insérer les articles" });
      }
    }

    // Mémoriser le groupe dans les détails du paiement (pour la finalisation)
    paiementDetails.groupe_id = groupeId;
    await supabaseAdmin
      .from("paiements")
      .update({ details: paiementDetails })
      .eq("id", paiementId);

    // -----------------------------------------------------------------------
    // 6. Réservation de stock
    //    Les RPC sont atomiques (UPDATE ... AND stock >= quantity + RAISE si 0),
    //    donc en cas de concurrence (deux commandes sur le dernier article) le
    //    décrément renvoie une erreur. On doit la détecter ET annuler tout ce
    //    qui a déjà été réservé AVANT d'appeler PVIT, sinon le client serait
    //    débité pour un article finalement en rupture.
    // -----------------------------------------------------------------------
    const stockReserve: typeof commandeArticles = [];
    const restaurerStockReserve = async () => {
      for (const ca of stockReserve) {
        if (ca.variation_to_update) {
          await supabaseAdmin.rpc("increment_variation_stock", {
            variation_id: ca.variation_to_update.id,
            quantity: ca.variation_to_update.quantite,
          });
        } else if (ca.article_to_update) {
          await supabaseAdmin.rpc("increment_article_stock", {
            article_id: ca.article_to_update.id,
            quantity: ca.article_to_update.quantite,
          });
        }
      }
    };

    for (const ca of commandeArticles) {
      let stockError = null;
      if (ca.variation_to_update) {
        ({ error: stockError } = await supabaseAdmin.rpc("decrement_variation_stock", {
          variation_id: ca.variation_to_update.id,
          quantity: ca.variation_to_update.quantite,
        }));
      } else if (ca.article_to_update) {
        ({ error: stockError } = await supabaseAdmin.rpc("decrement_article_stock", {
          article_id: ca.article_to_update.id,
          quantity: ca.article_to_update.quantite,
        }));
      }

      if (stockError) {
        console.error("[paiements/initiate] réservation stock échouée, rollback:", stockError);
        // Annuler le stock déjà réservé sur les lignes précédentes, puis purger
        // commandes/groupe/paiement. PVIT n'a pas encore été appelé.
        await restaurerStockReserve();
        await rollbackCommandes();
        return res.status(409).json({
          error: "Stock insuffisant : un article de votre panier vient d'être épuisé. Veuillez réessayer.",
        });
      }

      stockReserve.push(ca);
    }

    if (codePromoId) {
      await supabaseAdmin.rpc("increment_code_promo_utilisations", { promo_id: codePromoId });
    }

    // -----------------------------------------------------------------------
    // 7. Appeler PVIT — en cas d'échec, on rollback tout ce qui a été réservé
    // -----------------------------------------------------------------------
    console.log("[paiements/initiate] PVIT request:", {
      amount: total,
      customerAccountNumber: telephonePvit,
      operatorCode: toOperateurCode(body.operateur),
      reference,
    });

    let pvitResponse;
    try {
      pvitResponse = await pvitInitiatePaiement({
        amount: total,
        customerAccountNumber: telephonePvit,
        operatorCode: toOperateurCode(body.operateur),
        reference,
      });
    } catch (pvitErr) {
      console.error("[paiements/initiate] PVIT failed, rollback:", pvitErr);

      // Restaurer le stock réservé
      for (const ca of commandeArticles) {
        if (ca.variation_to_update) {
          await supabaseAdmin.rpc("increment_variation_stock", {
            variation_id: ca.variation_to_update.id,
            quantity: ca.variation_to_update.quantite,
          });
        } else if (ca.article_to_update) {
          await supabaseAdmin.rpc("increment_article_stock", {
            article_id: ca.article_to_update.id,
            quantity: ca.article_to_update.quantite,
          });
        }
      }

      // Décrémenter le compteur du code promo (si on l'avait incrémenté)
      if (codePromoId) {
        await supabaseAdmin.rpc("decrement_code_promo_utilisations", {
          promo_id: codePromoId,
        });
      }

      // Supprimer sous-commandes, groupe, puis paiement (ordre FK)
      await rollbackCommandes();

      return res.status(502).json({
        error: "Le service de paiement est temporairement indisponible. Veuillez réessayer.",
        details: pvitErr instanceof Error ? pvitErr.message : "Erreur PVIT",
      });
    }

    console.log("[paiements/initiate] PVIT response:", JSON.stringify(pvitResponse, null, 2));

    // Stocker le reference_id PVIT pour le check-status ultérieur
    await supabaseAdmin
      .from("paiements")
      .update({
        transaction_id: pvitResponse.reference_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paiementId);

    return res.status(200).json({
      message: "Paiement initié — en attente de confirmation",
      groupe_id: groupeId,
      // Rétrocompat : 1re sous-commande (l'app Flutter polle par paiement_id).
      commande_id: sousCommandeIds[0],
      sous_commande_ids: sousCommandeIds,
      commande_numero: numeroCommande,
      paiement_id: paiementId,
      reference,
      pvit_reference_id: pvitResponse.reference_id,
      pvit_statut: pvitResponse.status,
      montant: total,
      frais_livraison: fraisLivraison,
      ville_livraison: villeLivraison,
      remise_appliquee: remiseAppliquee,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ errors: err.flatten() });
    }
    console.error("Error /api/paiements/initiate:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
