import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/admin/boutiques/{id}:
 *   get:
 *     summary: Statistiques détaillées d'une boutique (Admin)
 *     description: >
 *       Retourne les statistiques complètes d'une boutique : revenus, commandes,
 *       top articles, réclamations, évolution des ventes sur 30 jours.
 *       Accessible uniquement aux administrateurs.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la boutique
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *           default: month
 *     responses:
 *       200:
 *         description: Statistiques détaillées de la boutique
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Boutique introuvable
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur")
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });

        const boutiqueId = req.query.id as string;
        const period = (req.query.period as string) || "month";

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

        // Récupérer le profil de la boutique
        const { data: boutique, error: boutiqueError } = await supabaseAdmin
            .from("users")
            .select("id, name, email, url_logo, phone, address, created_at, is_active, solde, role")
            .eq("id", boutiqueId)
            .eq("role", "Boutique")
            .single();

        if (boutiqueError || !boutique)
            return res.status(404).json({ error: "Boutique introuvable" });

        // Commandes de la boutique sur la période
        const { data: commandes } = await supabaseAdmin
            .from("commandes")
            .select("id, prix, statut, created_at")
            .eq("vendeur_id", boutiqueId)
            .gte("created_at", startDate.toISOString());

        // Toutes les commandes (all-time pour métriques globales)
        const { data: allCommandes } = await supabaseAdmin
            .from("commandes")
            .select("id, prix, statut, created_at")
            .eq("vendeur_id", boutiqueId);

        // Articles de la boutique
        const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("id, nom, prix, image_principale, is_promotion, stock, created_at")
            .eq("user_id", boutiqueId);

        const articleIds = articles?.map((a) => a.id) || [];

        // Top articles vendus (via commande_articles sur la période)
        const commandeIds = commandes?.map((c) => c.id) || [];
        let topArticles: any[] = [];

        if (commandeIds.length > 0 && articleIds.length > 0) {
            const { data: ca } = await supabaseAdmin
                .from("commande_articles")
                .select("article_id, quantite, prix_unitaire, articles(id, nom, image_principale, prix)")
                .in("commande_id", commandeIds)
                .in("article_id", articleIds);

            const articleSales: Record<string, any> = {};
            ca?.forEach((item: any) => {
                const id = item.article_id;
                if (!articleSales[id]) {
                    articleSales[id] = {
                        article_id: id,
                        nom: item.articles?.nom,
                        image: item.articles?.image_principale,
                        prix: item.articles?.prix,
                        quantite_vendue: 0,
                        revenu: 0,
                    };
                }
                articleSales[id].quantite_vendue += item.quantite;
                articleSales[id].revenu += item.quantite * (item.prix_unitaire || item.articles?.prix || 0);
            });

            topArticles = Object.values(articleSales)
                .sort((a: any, b: any) => b.quantite_vendue - a.quantite_vendue)
                .slice(0, 10);
        }

        // Réclamations liées aux commandes de la boutique (all-time)
        const allCommandeIds = allCommandes?.map((c) => c.id) || [];
        let reclamations: any[] = [];

        if (allCommandeIds.length > 0) {
            const { data: recs } = await supabaseAdmin
                .from("reclamations")
                .select("id, statut, created_at, commande_id")
                .in("commande_id", allCommandeIds);
            reclamations = recs || [];
        }

        // Évolution des revenus sur les 30 derniers jours
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return date.toISOString().split("T")[0];
        });

        const revenueByDay = last30Days.map((date) => {
            const dayOrders = allCommandes?.filter(
                (c) => c.created_at.startsWith(date) && c.statut === "Livrée"
            ) || [];
            return {
                date,
                revenue: dayOrders.reduce((sum, c) => sum + c.prix, 0),
                orders: dayOrders.length,
            };
        });

        // Calculs agrégés
        const totalCommandes = commandes?.length || 0;
        const commandesLivrees = commandes?.filter((c) => c.statut === "Livrée") || [];
        const chiffreAffaires = commandesLivrees.reduce((sum, c) => sum + c.prix, 0);
        const panierMoyen = commandesLivrees.length > 0
            ? Math.round(chiffreAffaires / commandesLivrees.length)
            : 0;
        const tauxConversion = totalCommandes > 0
            ? Math.round((commandesLivrees.length / totalCommandes) * 100 * 100) / 100
            : 0;

        const commandesByStatus = {
            en_attente: commandes?.filter((c) => c.statut === "En attente").length || 0,
            en_preparation: commandes?.filter((c) => c.statut === "En préparation").length || 0,
            prete_pour_livraison: commandes?.filter((c) => c.statut === "Prête pour livraison").length || 0,
            en_cours_de_livraison: commandes?.filter((c) => c.statut === "En cours de livraison").length || 0,
            livree: commandesLivrees.length,
            annulee: commandes?.filter((c) => c.statut === "Annulée").length || 0,
            remboursee: commandes?.filter((c) => c.statut === "Remboursée").length || 0,
        };

        const reclamationsByStatus = {
            total: reclamations.length,
            en_attente: reclamations.filter((r) =>
                r.statut === "En attente de traitement" || r.statut === "En cours"
            ).length,
            resolues: reclamations.filter((r) =>
                r.statut === "Remboursée" || r.statut === "Rejetée"
            ).length,
            taux: allCommandeIds.length > 0
                ? Math.round((reclamations.length / allCommandeIds.length) * 100 * 100) / 100
                : 0,
        };

        // Totaux all-time pour comparaison
        const allTimeCA = allCommandes
            ?.filter((c) => c.statut === "Livrée")
            .reduce((sum, c) => sum + c.prix, 0) || 0;

        return res.status(200).json({
            period,
            boutique: {
                id: boutique.id,
                name: boutique.name,
                email: boutique.email,
                url_logo: boutique.url_logo,
                phone: boutique.phone,
                address: boutique.address,
                created_at: boutique.created_at,
                is_active: boutique.is_active,
                solde: boutique.solde || 0,
            },
            finances: {
                chiffre_affaires: chiffreAffaires,
                chiffre_affaires_all_time: allTimeCA,
                panier_moyen: panierMoyen,
                solde_actuel: boutique.solde || 0,
            },
            commandes: {
                total: totalCommandes,
                total_all_time: allCommandes?.length || 0,
                taux_conversion: tauxConversion,
                by_status: commandesByStatus,
            },
            articles: {
                total: articles?.length || 0,
                en_promotion: articles?.filter((a) => a.is_promotion).length || 0,
                top_vendus: topArticles,
            },
            reclamations: reclamationsByStatus,
            evolution: revenueByDay,
        });
    } catch (err) {
        console.error("Error /api/analytics/admin/boutiques/[id]:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
