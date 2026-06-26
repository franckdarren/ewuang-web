// pages/api/remboursements/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/remboursements/create:
 *   post:
 *     summary: Crée une demande de remboursement (client)
 *     description: >
 *       Le client demande le remboursement d'une commande payée, avec un motif.
 *       La demande part en "En attente réponse vendeur" : le vendeur dispose de
 *       72h pour répondre, sans quoi elle est escaladée à l'administration.
 *     tags:
 *       - Remboursements
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commande_id, motif]
 *             properties:
 *               commande_id:
 *                 type: string
 *                 format: uuid
 *               motif:
 *                 type: string
 *     responses:
 *       201:
 *         description: Demande créée
 *       400:
 *         description: Données invalides / commande non éligible
 *       403:
 *         description: La commande n'appartient pas au client
 *       409:
 *         description: Une demande active existe déjà pour cette commande
 *       500:
 *         description: Erreur serveur
 */

// Délai laissé au vendeur pour répondre avant escalade automatique (heures).
const VENDEUR_DELAI_HEURES = 72;

// Statuts de commande pour lesquels un remboursement est éligible (commande payée).
const STATUTS_REMBOURSABLES = [
  "En préparation",
  "Prête pour livraison",
  "En cours de livraison",
  "Livrée",
];

const schema = z.object({
  commande_id: z.string().uuid(),
  motif: z.string().min(5, "Le motif doit faire au moins 5 caractères"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const body = schema.parse(req.body);

    // 1. La commande existe et appartient au client
    const { data: commande, error: commandeError } = await supabaseAdmin
      .from("commandes")
      .select("id, numero, user_id, statut, prix, paiement_id, vendeur_id")
      .eq("id", body.commande_id)
      .maybeSingle();

    if (commandeError || !commande) {
      return res.status(400).json({ error: "Commande introuvable" });
    }
    if (commande.user_id !== profile.id) {
      return res.status(403).json({ error: "Cette commande ne vous appartient pas" });
    }
    if (!STATUTS_REMBOURSABLES.includes(commande.statut)) {
      return res.status(400).json({
        error: "Cette commande n'est pas éligible à un remboursement (non payée ou déjà remboursée)",
      });
    }

    // 2. Pas de demande active déjà en cours
    const { data: existante } = await supabaseAdmin
      .from("remboursements")
      .select("id")
      .eq("commande_id", body.commande_id)
      .in("statut", [
        "En attente réponse vendeur",
        "En attente arbitrage admin",
        "En traitement par l'admin",
      ])
      .maybeSingle();

    if (existante) {
      return res
        .status(409)
        .json({ error: "Une demande de remboursement est déjà en cours pour cette commande" });
    }

    // 3. Résoudre le vendeur. Multi-boutiques : la sous-commande porte son
    //    vendeur_id (une seule boutique). Repli sur la propriété des articles
    //    pour les anciennes commandes (vendeur_id null).
    let vendeurId: string | null = commande.vendeur_id ?? null;
    if (!vendeurId) {
      const { data: articles } = await supabaseAdmin
        .from("commande_articles")
        .select("articles(user_id)")
        .eq("commande_id", body.commande_id);

      const articleRows = (articles ?? []) as unknown as {
        articles: { user_id: string } | null;
      }[];
      const vendeurIds = Array.from(
        new Set(
          articleRows
            .map((a) => a.articles?.user_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      vendeurId = vendeurIds[0] ?? null;
    }

    // 4. Créer la demande
    const deadline = new Date(Date.now() + VENDEUR_DELAI_HEURES * 60 * 60 * 1000);

    const { data: remboursement, error: insertError } = await supabaseAdmin
      .from("remboursements")
      .insert({
        commande_id: commande.id,
        paiement_id: commande.paiement_id,
        user_id: profile.id,
        vendeur_id: vendeurId,
        montant: commande.prix,
        motif: body.motif,
        statut: "En attente réponse vendeur",
        vendeur_deadline: deadline.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[remboursements/create]", insertError);
      return res.status(500).json({ error: "Impossible de créer la demande de remboursement" });
    }

    // 5. Notifier le vendeur (s'il existe)
    if (vendeurId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: vendeurId,
        type: "Commande",
        titre: "Nouvelle demande de remboursement",
        message: `Le client a demandé un remboursement pour la commande ${commande.numero}. Vous avez ${VENDEUR_DELAI_HEURES}h pour répondre.`,
        lien: `/remboursements/${remboursement.id}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      message: "Demande de remboursement créée",
      remboursement,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Body invalide", issues: err.issues });
    }
    console.error("Error /api/remboursements/create:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
