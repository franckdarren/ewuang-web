import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

/**
 * @swagger
 * /api/analytics/admin/boutiques:
 *   get:
 *     summary: Statistiques agrégées par boutique (Admin)
 *     description: >
 *       Retourne pour chaque boutique ses métriques clés : chiffre d'affaires,
 *       nombre de commandes, articles, réclamations, taux de conversion et panier moyen.
 *       Accessible uniquement aux administrateurs.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *           default: month
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [chiffre_affaires, commandes, articles, reclamations]
 *           default: chiffre_affaires
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Stats par boutique
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "stats.read");
        if (!auth) return;

        const period = (req.query.period as string) || "month";
        const sort = (req.query.sort as string) || "chiffre_affaires";
        const limit = parseInt(req.query.limit as string) || 50;

        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case "today":
                startDate.setHours(0, 0, 0, 0);
                break;
            case "week":
                startDate.setDate(now.getDate() - 7);
                break;
            case "year":
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case "all":
                startDate = new Date("2020-01-01");
                break;
            default:
                startDate.setMonth(now.getMonth() - 1);
        }

        // Récupérer toutes les boutiques
        const { data: boutiques, error: boutiqueError } = await supabaseAdmin
            .from("users")
            .select("id, name, email, url_logo, phone, created_at, is_active, solde")
            .eq("role", "Boutique");

        if (boutiqueError || !boutiques)
            return res.status(500).json({ error: "Impossible de récupérer les boutiques" });

        // Récupérer commandes sur la période
        const { data: commandes } = await supabaseAdmin
            .from("commandes")
            .select("id, prix, statut, created_at")
            .gte("created_at", startDate.toISOString());

        // Récupérer articles par boutique
        const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("id, user_id");

        // Récupérer réclamations sur la période
        const { data: reclamations } = await supabaseAdmin
            .from("reclamations")
            .select("id, commande_id, statut, created_at")
            .gte("created_at", startDate.toISOString());

        // Récupérer commandes_articles pour lier réclamations → vendeur
        const { data: commandeArticles } = await supabaseAdmin
            .from("commande_articles")
            .select("commande_id, article_id");

        // Index : article_id → user_id (boutique)
        const articleOwner: Record<string, string> = {};
        articles?.forEach((a) => { articleOwner[a.id] = a.user_id; });

        // Index : commande_id → boutique_id (via articles)
        const commandeBoutique: Record<string, string> = {};
        commandeArticles?.forEach((ca) => {
            if (!commandeBoutique[ca.commande_id] && articleOwner[ca.article_id]) {
                commandeBoutique[ca.commande_id] = articleOwner[ca.article_id];
            }
        });

        const STATUTS_PAYES = ["En préparation", "Prête pour livraison", "En cours de livraison", "Livrée"];

        // Construire stats par boutique
        const statsByBoutique: Record<string, any> = {};

        boutiques.forEach((b) => {
            statsByBoutique[b.id] = {
                id: b.id,
                name: b.name,
                email: b.email,
                url_logo: b.url_logo,
                phone: b.phone,
                created_at: b.created_at,
                is_active: b.is_active,
                solde: b.solde || 0,
                commandes: {
                    total: 0,
                    livrees: 0,
                    en_attente: 0,
                    en_preparation: 0,
                    annulees: 0,
                    remboursees: 0,
                },
                finances: {
                    chiffre_affaires: 0,
                    chiffre_affaires_en_cours: 0,
                    panier_moyen: 0,
                },
                articles_count: 0,
                reclamations: {
                    total: 0,
                    en_attente: 0,
                    resolues: 0,
                },
                taux_conversion: 0,
            };
        });

        // Agréger commandes via commande_articles (vendeur_id non fiable)
        commandes?.forEach((c) => {
            const bid = commandeBoutique[c.id];
            if (!bid || !statsByBoutique[bid]) return;
            const s = statsByBoutique[bid];
            s.commandes.total += 1;

            if (STATUTS_PAYES.includes(c.statut)) {
                s.commandes.livrees += 1;
                s.finances.chiffre_affaires += c.prix;
            } else if (c.statut === "En attente") {
                s.commandes.en_attente += 1;
            } else if (c.statut === "Annulée") {
                s.commandes.annulees += 1;
            } else if (c.statut === "Remboursée") {
                s.commandes.remboursees += 1;
            }
        });

        // Compter les articles par boutique
        articles?.forEach((a) => {
            if (statsByBoutique[a.user_id]) {
                statsByBoutique[a.user_id].articles_count += 1;
            }
        });

        // Agréger réclamations via commandeBoutique
        reclamations?.forEach((r) => {
            const bid = commandeBoutique[r.commande_id];
            if (!bid || !statsByBoutique[bid]) return;
            const s = statsByBoutique[bid];
            s.reclamations.total += 1;
            if (r.statut === "En attente de traitement" || r.statut === "En cours") {
                s.reclamations.en_attente += 1;
            } else {
                s.reclamations.resolues += 1;
            }
        });

        // Calculer taux conversion et panier moyen
        const result = Object.values(statsByBoutique).map((s: any) => {
            const total = s.commandes.total;
            const livrees = s.commandes.livrees;
            s.taux_conversion = total > 0 ? Math.round((livrees / total) * 100 * 100) / 100 : 0;
            s.finances.panier_moyen = livrees > 0
                ? Math.round(s.finances.chiffre_affaires / livrees)
                : 0;
            return s;
        });

        // Tri
        const sortFns: Record<string, (a: any, b: any) => number> = {
            chiffre_affaires: (a, b) => b.finances.chiffre_affaires - a.finances.chiffre_affaires,
            commandes: (a, b) => b.commandes.total - a.commandes.total,
            articles: (a, b) => b.articles_count - a.articles_count,
            reclamations: (a, b) => b.reclamations.total - a.reclamations.total,
        };
        result.sort(sortFns[sort] || sortFns.chiffre_affaires);

        return res.status(200).json({
            period,
            sort,
            total_boutiques: result.length,
            boutiques: result.slice(0, limit),
        });
    } catch (err) {
        console.error("Error /api/analytics/admin/boutiques:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
