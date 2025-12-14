// pages/api/dashboard/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/analytics/admin/stats:
 *   get:
 *     summary: Récupère les statistiques globales (Admin)
 *     description: >
 *       Retourne toutes les statistiques nécessaires pour le dashboard d'administration :
 *       revenus, commandes, utilisateurs, produits, livraisons, réclamations, etc.
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
 *           enum: [today, week, month, year]
 *           default: month
 *         description: Période pour les statistiques temporelles
 *     responses:
 *       200:
 *         description: Statistiques du dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   description: Vue d'ensemble générale
 *                 revenue:
 *                   type: object
 *                   description: Statistiques de revenus
 *                 orders:
 *                   type: object
 *                   description: Statistiques des commandes
 *                 users:
 *                   type: object
 *                   description: Statistiques des utilisateurs
 *                 products:
 *                   type: object
 *                   description: Statistiques des produits
 *                 deliveries:
 *                   type: object
 *                   description: Statistiques des livraisons
 *                 claims:
 *                   type: object
 *                   description: Statistiques des réclamations
 *                 topPerformers:
 *                   type: object
 *                   description: Meilleurs performeurs
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier que l'utilisateur est admin
        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
        }

        const period = (req.query.period as string) || "month";
        const now = new Date();
        let startDate = new Date();

        // Calculer la date de début selon la période
        switch (period) {
            case "today":
                startDate.setHours(0, 0, 0, 0);
                break;
            case "week":
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "year":
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // ============================================
        // 1. VUE D'ENSEMBLE (OVERVIEW)
        // ============================================

        // Total des commandes et revenus
        const { data: allOrders } = await supabaseAdmin
            .from("commandes")
            .select("prix, created_at, statut");

        const totalRevenue = allOrders?.reduce((sum, order) => sum + order.prix, 0) || 0;
        const totalOrders = allOrders?.length || 0;

        // Commandes et revenus de la période
        const periodOrders = allOrders?.filter(
            (order) => new Date(order.created_at) >= startDate
        ) || [];
        const periodRevenue = periodOrders.reduce((sum, order) => sum + order.prix, 0);
        const periodOrdersCount = periodOrders.length;

        // Calcul des pourcentages de croissance
        const previousPeriodOrders = allOrders?.filter((order) => {
            const orderDate = new Date(order.created_at);
            const periodStart = new Date(startDate);
            const periodDuration = now.getTime() - startDate.getTime();
            const previousPeriodStart = new Date(periodStart.getTime() - periodDuration);
            return orderDate >= previousPeriodStart && orderDate < periodStart;
        }) || [];

        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + order.prix, 0);
        const revenueGrowth = previousRevenue > 0
            ? ((periodRevenue - previousRevenue) / previousRevenue) * 100
            : 100;
        const ordersGrowth = previousPeriodOrders.length > 0
            ? ((periodOrdersCount - previousPeriodOrders.length) / previousPeriodOrders.length) * 100
            : 100;

        // Taux de conversion (commandes livrées / total)
        const deliveredOrders = allOrders?.filter(o => o.statut === "Livrée").length || 0;
        const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

        // Panier moyen
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // ============================================
        // 2. STATISTIQUES UTILISATEURS
        // ============================================

        const { data: allUsers, count: totalUsers } = await supabaseAdmin
            .from("users")
            .select("*", { count: "exact" });

        const newUsers = allUsers?.filter(
            (user) => new Date(user.created_at) >= startDate
        ).length || 0;

        const { count: totalCustomers } = await supabaseAdmin
            .from("users")
            .select("*", { count: "exact", head: true })
            .neq("role", "Client");

        const { count: totalBoutiques } = await supabaseAdmin
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "Boutique");

        // ============================================
        // 3. STATISTIQUES PRODUITS
        // ============================================

        const { count: totalProducts } = await supabaseAdmin
            .from("articles")
            .select("*", { count: "exact", head: true });

        const { data: newProducts } = await supabaseAdmin
            .from("articles")
            .select("created_at")
            .gte("created_at", startDate.toISOString());

        const { count: productsInPromotion } = await supabaseAdmin
            .from("articles")
            .select("*", { count: "exact", head: true })
            .eq("is_promotion", true);

        const { count: madeInGabonProducts } = await supabaseAdmin
            .from("articles")
            .select("*", { count: "exact", head: true })
            .eq("made_in_gabon", true);

        // Produits en rupture de stock (variations avec stock = 0)
        const { count: outOfStockProducts } = await supabaseAdmin
            .from("variations")
            .select("*", { count: "exact", head: true })
            .eq("stock", 0);

        // ============================================
        // 4. STATISTIQUES COMMANDES PAR STATUT
        // ============================================

        const ordersByStatus = {
            en_attente: allOrders?.filter(o => o.statut === "En attente").length || 0,
            en_preparation: allOrders?.filter(o => o.statut === "En préparation").length || 0,
            prete_pour_livraison: allOrders?.filter(o => o.statut === "Prête pour livraison").length || 0,
            en_cours_de_livraison: allOrders?.filter(o => o.statut === "En cours de livraison").length || 0,
            livree: deliveredOrders,
            annule: allOrders?.filter(o => o.statut === "Annulée").length || 0,
            rembourse: allOrders?.filter(o => o.statut === "Remboursée").length || 0,
        };

        // ============================================
        // 5. STATISTIQUES LIVRAISONS
        // ============================================

        const { data: allDeliveries } = await supabaseAdmin
            .from("livraisons")
            .select("statut, ville, created_at");

        const deliveriesByStatus = {
            en_attente: allDeliveries?.filter(d => d.statut === "En attente").length || 0,
            en_cours: allDeliveries?.filter(d => d.statut === "En cours de livraison").length || 0,
            livree: allDeliveries?.filter(d => d.statut === "Livrée").length || 0,
            annulee: allDeliveries?.filter(d => d.statut === "Annulée").length || 0,
            reportee: allDeliveries?.filter(d => d.statut === "Reportée").length || 0,
        };

        const deliveriesByCity = allDeliveries?.reduce((acc: any, delivery) => {
            const city = delivery.ville || "Autre";
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {}) || {};

        const pendingDeliveries = deliveriesByStatus.en_attente + deliveriesByStatus.en_cours;

        // ============================================
        // 6. STATISTIQUES RÉCLAMATIONS
        // ============================================

        const { data: allClaims } = await supabaseAdmin
            .from("reclamations")
            .select("statut, created_at");

        const claimsByStatus = {
            en_attente_de_traitement: allClaims?.filter(c => c.statut === "En attente de traitement").length || 0,
            en_cours: allClaims?.filter(c => c.statut === "En cours").length || 0,
            rejete: allClaims?.filter(c => c.statut === "Rejetée").length || 0,
            rembourse: allClaims?.filter(c => c.statut === "Remboursée").length || 0,
        };

        const newClaims = allClaims?.filter(
            (claim) => new Date(claim.created_at) >= startDate
        ).length || 0;

        const totalClaims = allClaims?.length || 0;
        const claimRate = totalOrders > 0 ? (totalClaims / totalOrders) * 100 : 0;

        // ============================================
        // 7. TOP PERFORMERS
        // ============================================

        // Top 5 articles les plus vendus
        const { data: topProducts } = await supabaseAdmin
            .from("commande_articles")
            .select(`
        article_id,
        quantite,
        articles (nom, prix, image_principale)
        `);

        const productSales = topProducts?.reduce((acc: any, item: any) => {
            const id = item.article_id;
            if (!acc[id]) {
                acc[id] = {
                    article_id: id,
                    name: item.articles?.nom,
                    image: item.articles?.image_principale,
                    price: item.articles?.prix,
                    totalQuantity: 0,
                };
            }
            acc[id].totalQuantity += item.quantite;
            return acc;
        }, {}) || {};

        const topSellingProducts = Object.values(productSales)
            .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
            .slice(0, 5);

        // Top 5 boutiques par revenus
        const { data: boutiqueRevenues } = await supabaseAdmin
            .from("users")
            .select("id, name, email, solde, url_logo")
            .eq("role", "Boutique")
            .order("solde", { ascending: false })
            .limit(5);

        // Top 5 catégories
        const { data: categorySales } = await supabaseAdmin
            .from("commande_articles")
            .select(`
        quantite,
        articles (categorie)
        `);

        const categoryStats = categorySales?.reduce((acc: any, item: any) => {
            const category = item.articles?.categorie || "Autre";
            acc[category] = (acc[category] || 0) + item.quantite;
            return acc;
        }, {}) || {};

        const topCategories = Object.entries(categoryStats)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a: any, b: any) => b.sales - a.sales)
            .slice(0, 5);

        // ============================================
        // 8. ÉVOLUTION DES REVENUS (30 derniers jours)
        // ============================================

        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return date.toISOString().split("T")[0];
        });

        const revenueByDay = last30Days.map((date) => {
            const dayOrders = allOrders?.filter(
                (order) => order.created_at.startsWith(date)
            ) || [];
            const dayRevenue = dayOrders.reduce((sum, order) => sum + order.prix, 0);
            return {
                date,
                revenue: dayRevenue,
                orders: dayOrders.length,
            };
        });

        // ============================================
        // 9. COMMANDES RÉCENTES
        // ============================================

        const { data: recentOrders } = await supabaseAdmin
            .from("commandes")
            .select(`
        id,
        numero,
        prix,
        statut,
        created_at,
        users (name, email)
        `)
            .order("created_at", { ascending: false })
            .limit(10);

        // ============================================
        // 10. ALERTES ET NOTIFICATIONS
        // ============================================

        const alerts = {
            pendingOrders: ordersByStatus.en_attente,
            pendingClaims: claimsByStatus.en_attente_de_traitement,
            pendingDeliveries,
            outOfStock: outOfStockProducts || 0,
            urgentCount: (ordersByStatus.en_attente || 0) + (claimsByStatus.en_attente_de_traitement || 0),
        };

        // ============================================
        // RÉPONSE FINALE
        // ============================================

        return res.status(200).json({
            period,
            generatedAt: new Date().toISOString(),

            overview: {
                totalRevenue,
                periodRevenue,
                revenueGrowth: Math.round(revenueGrowth * 100) / 100,
                totalOrders,
                periodOrders: periodOrdersCount,
                ordersGrowth: Math.round(ordersGrowth * 100) / 100,
                averageOrderValue: Math.round(averageOrderValue),
                conversionRate: Math.round(conversionRate * 100) / 100,
                totalUsers: totalUsers || 0,
                newUsers,
                totalProducts: totalProducts || 0,
            },

            revenue: {
                total: totalRevenue,
                period: periodRevenue,
                growth: Math.round(revenueGrowth * 100) / 100,
                average: Math.round(averageOrderValue),
                byDay: revenueByDay,
            },

            orders: {
                total: totalOrders,
                period: periodOrdersCount,
                growth: Math.round(ordersGrowth * 100) / 100,
                byStatus: ordersByStatus,
                recent: recentOrders,
            },

            users: {
                total: totalUsers || 0,
                clients: totalCustomers || 0,
                boutiques: totalBoutiques || 0,
                newUsers,
            },

            products: {
                total: totalProducts || 0,
                newProducts: newProducts?.length || 0,
                inPromotion: productsInPromotion || 0,
                madeInGabon: madeInGabonProducts || 0,
                outOfStock: outOfStockProducts || 0,
            },

            livraisons: {
                total: allDeliveries?.length || 0,
                byStatus: deliveriesByStatus,
                byCity: deliveriesByCity,
                pending: pendingDeliveries,
            },

            reclamations: {
                total: totalClaims,
                new: newClaims,
                byStatus: claimsByStatus,
                rate: Math.round(claimRate * 100) / 100,
            },

            topPerformers: {
                products: topSellingProducts,
                boutiques: boutiqueRevenues || [],
                categories: topCategories,
            },

            alerts,
        });
    } catch (err) {
        console.error("Error /api/dashboard/stats:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}