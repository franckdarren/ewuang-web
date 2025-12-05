// pages/api/commandes/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/create:
 *   post:
 *     summary: Crée une nouvelle commande
 *     description: >
 *       Crée une commande avec des articles, gère les stocks, calcule les frais
 *       et met à jour les soldes des boutiques et de l'admin.
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commentaire
 *               - isLivrable
 *               - articles
 *               - adresse_livraison
 *             properties:
 *               commentaire:
 *                 type: string
 *               isLivrable:
 *                 type: boolean
 *               adresse_livraison:
 *                 type: string
 *                 maxLength: 255
 *               articles:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - article_id
 *                     - quantite
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
 *       201:
 *         description: Commande créée avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const createCommandeSchema = z.object({
    commentaire: z.string().optional().default(""),
    isLivrable: z.boolean(),
    adresse_livraison: z.string().max(255),
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
 * Génère un numéro de commande séquentiel au format CMD-YY-XXXXX
 * Exemple: CMD-24-00001, CMD-24-00002, etc.
 * Capacité: 99,999 commandes par an
 */
async function generateOrderNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearShort = currentYear.toString().slice(-2); // 24 pour 2024

    // Récupérer le nombre de commandes pour l'année en cours
    const { count, error } = await supabaseAdmin
        .from("commandes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${currentYear}-01-01T00:00:00.000Z`)
        .lte("created_at", `${currentYear}-12-31T23:59:59.999Z`);

    if (error) {
        console.error("Erreur lors du comptage des commandes:", error);
        // En cas d'erreur, utiliser un timestamp pour éviter les doublons
        return `CMD-${yearShort}-${Date.now().toString().slice(-5)}`;
    }

    const nextNumber = (count || 0) + 1;
    const paddedNumber = String(nextNumber).padStart(5, "0");

    return `CMD-${yearShort}-${paddedNumber}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = createCommandeSchema.parse(req.body);

        // Générer un numéro de commande séquentiel
        const numeroCommande = await generateOrderNumber();

        let total = 0;
        let adminFrais = 0;
        const boutiqueIds: string[] = [];
        const commandeArticles: any[] = [];

        // 1. Récupérer l'admin
        const { data: admin, error: adminError } = await supabaseAdmin
            .from("users")
            .select("id, solde")
            .eq("role", "Administrateur")
            .single();

        if (adminError || !admin) {
            return res.status(500).json({ error: "Aucun administrateur trouvé" });
        }

        // 2. Valider les articles et calculer les montants
        for (const item of body.articles) {
            const { data: article, error: articleError } = await supabaseAdmin
                .from("articles")
                .select(`
          id,
          prix,
          prix_promotion,
          is_promotion,
          user_id,
          variations (id, prix, stock)
        `)
                .eq("id", item.article_id)
                .single();

            if (articleError || !article) {
                return res.status(400).json({
                    error: `Article ${item.article_id} introuvable`
                });
            }

            // Stocker l'ID de la boutique
            boutiqueIds.push(article.user_id);

            let prixUnitaire = 0;
            let variation = null;

            // Gestion des variations
            if (item.variation_id) {
                variation = article.variations?.find((v: any) => v.id === item.variation_id);

                if (!variation) {
                    return res.status(400).json({
                        error: `Variation ${item.variation_id} introuvable`
                    });
                }

                if (variation.stock < item.quantite) {
                    return res.status(400).json({
                        error: `Stock insuffisant pour la variation ${variation.id}`
                    });
                }

                prixUnitaire = article.is_promotion
                    ? article.prix_promotion
                    : (variation.prix !== 0 ? variation.prix : article.prix);
            } else {
                prixUnitaire = article.is_promotion ? article.prix_promotion : article.prix;
            }

            const sousTotal = prixUnitaire * item.quantite;
            total += sousTotal;

            // Calculer les frais de service
            let frais = 0;
            if (prixUnitaire < 15000) {
                frais = 300 * item.quantite;
            } else if (prixUnitaire < 50000) {
                frais = 500 * item.quantite;
            } else {
                frais = 1000 * item.quantite;
            }

            const benefice = sousTotal - frais;
            adminFrais += frais;

            commandeArticles.push({
                article_id: item.article_id,
                variation_id: item.variation_id || null,
                quantite: item.quantite,
                prix_unitaire: prixUnitaire,
                boutique_user_id: article.user_id,
                benefice,
                variation_to_update: variation ? { id: variation.id, quantite: item.quantite } : null,
            });
        }

        // 3. Calculer les frais de livraison
        const adresseLower = body.adresse_livraison.toLowerCase();
        let baseLivraison = 3000;

        if (adresseLower.includes("libreville")) {
            baseLivraison = 2500;
        } else if (adresseLower.includes("akanda")) {
            baseLivraison = 2000;
        } else if (adresseLower.includes("owendo")) {
            baseLivraison = 3000;
        }

        const nombreBoutiques = [...new Set(boutiqueIds)].length;
        const livraison = Math.min(baseLivraison * nombreBoutiques, 8000);
        total += livraison;

        // 4. Début de la transaction (simulation avec try/catch)
        try {
            // Créer la commande
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
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (commandeError) {
                throw new Error(`Erreur création commande: ${commandeError.message}`);
            }

            // Insérer les articles de la commande
            const articlesToInsert = commandeArticles.map((ca) => ({
                commande_id: commande.id,
                article_id: ca.article_id,
                variation_id: ca.variation_id,
                quantite: ca.quantite,
                prix_unitaire: ca.prix_unitaire,
            }));

            const { error: insertArticlesError } = await supabaseAdmin
                .from("commande_articles")
                .insert(articlesToInsert);

            if (insertArticlesError) {
                throw new Error(`Erreur insertion articles: ${insertArticlesError.message}`);
            }

            // Mettre à jour les stocks des variations
            for (const ca of commandeArticles) {
                if (ca.variation_to_update) {
                    const { error: stockError } = await supabaseAdmin.rpc(
                        "decrement_variation_stock",
                        {
                            variation_id: ca.variation_to_update.id,
                            quantity: ca.variation_to_update.quantite,
                        }
                    );

                    if (stockError) {
                        throw new Error(`Erreur mise à jour stock: ${stockError.message}`);
                    }
                }
            }

            // Mettre à jour les soldes des boutiques
            const boutiqueUpdates = commandeArticles.reduce((acc, ca) => {
                if (!acc[ca.boutique_user_id]) {
                    acc[ca.boutique_user_id] = 0;
                }
                acc[ca.boutique_user_id] += ca.benefice;
                return acc;
            }, {} as Record<string, number>);

            for (const [userId, benefice] of Object.entries(boutiqueUpdates)) {
                const { error: boutiqueError } = await supabaseAdmin.rpc(
                    "increment_user_solde",
                    {
                        user_id: userId,
                        amount: benefice,
                    }
                );

                if (boutiqueError) {
                    throw new Error(`Erreur mise à jour solde boutique: ${boutiqueError.message}`);
                }
            }

            // Mettre à jour le solde de l'admin
            const { error: adminSoldeError } = await supabaseAdmin.rpc(
                "increment_user_solde",
                {
                    user_id: admin.id,
                    amount: adminFrais,
                }
            );

            if (adminSoldeError) {
                throw new Error(`Erreur mise à jour solde admin: ${adminSoldeError.message}`);
            }

            // Récupérer la commande complète avec les articles
            const { data: commandeComplete, error: fetchError } = await supabaseAdmin
                .from("commandes")
                .select(`
          *,
          commande_articles (
            *,
            articles (*),
            variations (*)
          )
        `)
                .eq("id", commande.id)
                .single();

            if (fetchError) {
                console.warn("Erreur récupération commande complète:", fetchError);
            }

            return res.status(201).json({
                message: "Commande créée avec succès",
                commande: commandeComplete || commande,
            });
        } catch (transactionError: any) {
            // En cas d'erreur, on retourne une erreur 500
            console.error("Transaction error:", transactionError);
            return res.status(500).json({
                error: "Erreur lors de la création de la commande",
                details: transactionError.message,
            });
        }
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/commandes/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}