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
 *                 description: Numéro MSISDN du client (ex: 077XXXXXXX)
 *               isLivrable:
 *                 type: boolean
 *               adresse_livraison:
 *                 type: string
 *               commentaire:
 *                 type: string
 *               code_promo:
 *                 type: string
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
  isLivrable: z.boolean(),
  adresse_livraison: z.string().max(255),
  commentaire: z.string().optional().default(""),
  code_promo: z.string().optional(),
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

async function generateOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearShort = currentYear.toString().slice(-2);

  const { count, error } = await supabaseAdmin
    .from("commandes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${currentYear}-01-01T00:00:00.000Z`)
    .lte("created_at", `${currentYear}-12-31T23:59:59.999Z`);

  if (error) return `CMD-${yearShort}-${Date.now().toString().slice(-5)}`;

  const nextNumber = (count || 0) + 1;
  return `CMD-${yearShort}-${String(nextNumber).padStart(5, "0")}`;
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
    // 3. Frais de livraison
    // -----------------------------------------------------------------------
    const adresseLower = body.adresse_livraison.toLowerCase();
    let baseLivraison = 3000;
    if (adresseLower.includes("libreville")) baseLivraison = 2500;
    else if (adresseLower.includes("akanda")) baseLivraison = 2000;
    else if (adresseLower.includes("owendo")) baseLivraison = 3000;

    const nombreBoutiques = [...new Set(boutiqueIds)].length;
    total += Math.min(baseLivraison * nombreBoutiques, 8000);

    // -----------------------------------------------------------------------
    // 4. Créer l'enregistrement paiement en premier (requis par la FK commandes.paiement_id)
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

    const { error: paiementError } = await supabaseAdmin.from("paiements").insert({
      id: paiementId,
      user_id: profile.id,
      montant: total,
      methode: "mobile_money",
      statut: "En attente",
      reference,
      details: {
        commande_id: null, // mis à jour après création de la commande
        operateur: body.operateur,
        telephone: body.telephone,
        admin_id: admin?.id ?? null,
        admin_frais: adminFrais,
        boutique_benefices: boutiqueBenefices,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (paiementError) {
      console.error("[paiements/initiate] paiement insert:", paiementError);
      return res.status(500).json({ error: "Impossible de créer le paiement" });
    }

    // -----------------------------------------------------------------------
    // 5. Créer la commande (En attente) — paiement_id existe maintenant
    // -----------------------------------------------------------------------
    const { data: commande, error: commandeError } = await supabaseAdmin
      .from("commandes")
      .insert({
        numero: numeroCommande,
        user_id: profile.id,
        commentaire: body.commentaire,
        statut: "En attente",
        isLivrable: body.isLivrable,
        prix: total,
        adresse_livraison: body.adresse_livraison,
        code_promo_id: codePromoId,
        remise_appliquee: remiseAppliquee,
        paiement_id: paiementId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commandeError) {
      console.error("[paiements/initiate] commande insert:", commandeError);
      await supabaseAdmin.from("paiements").delete().eq("id", paiementId);
      return res.status(500).json({ error: "Impossible de créer la commande" });
    }

    // Mettre à jour commande_id dans les détails du paiement
    await supabaseAdmin
      .from("paiements")
      .update({ details: { commande_id: commande.id, operateur: body.operateur, telephone: body.telephone, admin_id: admin?.id ?? null, admin_frais: adminFrais, boutique_benefices: boutiqueBenefices } })
      .eq("id", paiementId);

    // -----------------------------------------------------------------------
    // 6. Articles + réservation de stock
    // -----------------------------------------------------------------------
    const { error: articlesError } = await supabaseAdmin
      .from("commande_articles")
      .insert(
        commandeArticles.map((ca) => ({
          commande_id: commande.id,
          article_id: ca.article_id,
          variation_id: ca.variation_id,
          quantite: ca.quantite,
          prix_unitaire: ca.prix_unitaire,
        }))
      );

    if (articlesError) {
      await supabaseAdmin.from("commandes").delete().eq("id", commande.id);
      await supabaseAdmin.from("paiements").delete().eq("id", paiementId);
      return res.status(500).json({ error: "Impossible d'insérer les articles" });
    }

    for (const ca of commandeArticles) {
      if (ca.variation_to_update) {
        await supabaseAdmin.rpc("decrement_variation_stock", {
          variation_id: ca.variation_to_update.id,
          quantity: ca.variation_to_update.quantite,
        });
      } else if (ca.article_to_update) {
        await supabaseAdmin.rpc("decrement_article_stock", {
          article_id: ca.article_to_update.id,
          quantity: ca.article_to_update.quantite,
        });
      }
    }

    if (codePromoId) {
      await supabaseAdmin.rpc("increment_code_promo_utilisations", { promo_id: codePromoId });
    }

    // -----------------------------------------------------------------------
    // 7. Appeler PVIT
    // -----------------------------------------------------------------------
    const pvitResponse = await pvitInitiatePaiement({
      amount: total,
      customerAccountNumber: body.telephone,
      operatorCode: toOperateurCode(body.operateur),
      reference,
    });

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
      commande_id: commande.id,
      commande_numero: numeroCommande,
      paiement_id: paiementId,
      reference,
      pvit_reference_id: pvitResponse.reference_id,
      pvit_statut: pvitResponse.status,
      montant: total,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ errors: err.flatten() });
    }
    console.error("Error /api/paiements/initiate:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
