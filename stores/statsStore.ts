// stores/statsStore.ts
/**
 * StatsStore - Store pour gérer les statistiques du dashboard
 * 
 * Ce store est le cerveau analytique de votre dashboard admin.
 * Il récupère et stocke toutes les métriques importantes :
 * - Vue d'ensemble des revenus
 * - Statistiques des commandes
 * - Statistiques des utilisateurs
 * - Données pour les graphiques
 * - Comparaisons temporelles
 * 
 * Pourquoi un store séparé pour les stats ?
 * Les statistiques sont souvent calculées différemment des données brutes.
 * Elles nécessitent des agrégations, des calculs complexes et des requêtes
 * optimisées côté serveur. En les séparant, on garde le code organisé.
 */

import { create } from 'zustand';
import { DashboardStats, LoadingState } from './types/common';

// ============================================
// TYPES ADDITIONNELS POUR LES STATS
// ============================================

/**
 * Période de temps pour filtrer les statistiques
 * Permet de voir les stats sur différentes périodes
 */
export type PeriodeStats = 'aujourd_hui' | 'semaine' | 'mois' | 'annee' | 'tout';

/**
 * Données pour un graphique en ligne (évolution dans le temps)
 */
interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

/**
 * Données pour un graphique circulaire (répartition)
 */
interface PieChartData {
    label: string;
    value: number;
    color?: string;
}

/**
 * Comparaison avec la période précédente
 * Utile pour afficher des pourcentages d'évolution
 */
interface Comparison {
    current: number;
    previous: number;
    difference: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'stable';
}

// ============================================
// DÉFINITION DE L'INTERFACE DU STORE
// ============================================

interface StatsState extends LoadingState {
    // -------- ÉTAT (Les données) --------

    /**
     * Période actuellement sélectionnée
     */
    periode: PeriodeStats;

    /**
     * Statistiques globales du dashboard
     */
    dashboardStats: DashboardStats | null;

    /**
     * Statistiques détaillées des revenus
     */
    revenusStats: {
        total: number;
        parJour: ChartDataPoint[];
        parMois: ChartDataPoint[];
        parMethodePaiement: PieChartData[];
        comparison: Comparison;
    } | null;

    /**
     * Statistiques détaillées des commandes
     */
    commandesStats: {
        total: number;
        parStatut: PieChartData[];
        evolutionTemps: ChartDataPoint[];
        tauxConversion: number;
        panierMoyen: number;
        comparison: Comparison;
    } | null;

    /**
     * Statistiques des utilisateurs
     */
    utilisateursStats: {
        total: number;
        actifs: number;
        nouveaux: number;
        parRole: PieChartData[];
        evolutionInscriptions: ChartDataPoint[];
        tauxRetention: number;
        comparison: Comparison;
    } | null;

    /**
     * Top performers (meilleurs articles, boutiques, etc.)
     */
    topPerformers: {
        topArticles: Array<{
            id: string;
            nom: string;
            ventes: number;
            revenu: number;
        }>;
        topBoutiques: Array<{
            id: string;
            nom: string;
            commandes: number;
            revenu: number;
        }>;
        topClients: Array<{
            id: string;
            nom: string;
            commandes: number;
            montantDepense: number;
        }>;
    } | null;

    /**
     * Dernière mise à jour des statistiques
     */
    lastUpdated: Date | null;

    // -------- ACTIONS --------

    /**
     * Récupère toutes les statistiques du dashboard
     */
    fetchDashboardStats: () => Promise<void>;

    /**
     * Récupère les statistiques de revenus
     */
    fetchRevenusStats: () => Promise<void>;

    /**
     * Récupère les statistiques de commandes
     */
    fetchCommandesStats: () => Promise<void>;

    /**
     * Récupère les statistiques d'utilisateurs
     */
    fetchUtilisateursStats: () => Promise<void>;

    /**
     * Récupère les top performers
     */
    fetchTopPerformers: () => Promise<void>;

    /**
     * Change la période de temps
     */
    setPeriode: (periode: PeriodeStats) => void;

    /**
     * Rafraîchit toutes les statistiques
     */
    refreshAll: () => Promise<void>;

    /**
     * Efface toutes les statistiques
     */
    clearStats: () => void;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Calcule la comparaison entre deux valeurs
 * Retourne un objet Comparison avec le pourcentage de changement
 */
function calculateComparison(current: number, previous: number): Comparison {
    const difference = current - previous;
    const percentageChange = previous !== 0
        ? ((difference / previous) * 100)
        : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 0.5) trend = 'up';
    else if (percentageChange < -0.5) trend = 'down';

    return {
        current,
        previous,
        difference,
        percentageChange: Math.round(percentageChange * 10) / 10, // Arrondir à 1 décimale
        trend,
    };
}

/**
 * Formatte une date pour l'affichage dans les graphiques
 */
function formatDateForChart(date: string, periode: PeriodeStats): string {
    const d = new Date(date);

    switch (periode) {
        case 'aujourd_hui':
            return `${d.getHours()}h`; // "14h", "15h"
        case 'semaine':
            return d.toLocaleDateString('fr-FR', { weekday: 'short' }); // "Lun", "Mar"
        case 'mois':
            return `${d.getDate()}/${d.getMonth() + 1}`; // "15/01"
        case 'annee':
            return d.toLocaleDateString('fr-FR', { month: 'short' }); // "Jan", "Fev"
        default:
            return d.toLocaleDateString('fr-FR'); // "15/01/2024"
    }
}

// ============================================
// CRÉATION DU STORE
// ============================================

export const useStatsStore = create<StatsState>((set, get) => ({
    // -------- ÉTAT INITIAL --------
    periode: 'mois',
    dashboardStats: null,
    revenusStats: null,
    commandesStats: null,
    utilisateursStats: null,
    topPerformers: null,
    lastUpdated: null,
    isLoading: false,
    error: null,

    // -------- IMPLÉMENTATION DES ACTIONS --------

    /**
     * FETCH DASHBOARD STATS - Récupérer les stats globales
     * 
     * Cette fonction récupère un aperçu général de toutes les métriques.
     * C'est typiquement ce qui s'affiche en haut de votre dashboard :
     * les KPIs (Key Performance Indicators) principaux.
     */
    fetchDashboardStats: async () => {
        set({ isLoading: true, error: null });

        try {
            const periode = get().periode;

            // Appeler l'API avec la période sélectionnée
            const response = await fetch(`/api/analytics/dashboard?periode=${periode}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des statistiques');
            }

            const stats: DashboardStats = await response.json();

            set({
                dashboardStats: stats,
                lastUpdated: new Date(),
                isLoading: false,
                error: null,
            });

            console.log('✅ Statistiques du dashboard chargées:', stats);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement des statistiques';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchDashboardStats:', errorMessage);
        }
    },

    /**
     * FETCH REVENUS STATS - Récupérer les stats de revenus
     * 
     * Cette fonction charge des données détaillées sur les revenus :
     * - Évolution dans le temps (pour les graphiques)
     * - Répartition par méthode de paiement
     * - Comparaison avec la période précédente
     */
    fetchRevenusStats: async () => {
        set({ isLoading: true, error: null });

        try {
            const periode = get().periode;
            const response = await fetch(`/api/analytics/revenus?periode=${periode}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des revenus');
            }

            const data = await response.json();

            // Transformer les données pour les graphiques
            const parJour: ChartDataPoint[] = data.parJour.map((item: any) => ({
                date: formatDateForChart(item.date, periode),
                value: item.montant,
            }));

            const parMois: ChartDataPoint[] = data.parMois.map((item: any) => ({
                date: formatDateForChart(item.date, 'annee'),
                value: item.montant,
            }));

            const parMethodePaiement: PieChartData[] = data.parMethode.map((item: any) => ({
                label: item.methode,
                value: item.montant,
                color: getColorForPaymentMethod(item.methode),
            }));

            // Calculer la comparaison
            const comparison = calculateComparison(
                data.revenusCurrent,
                data.revenusPrevious
            );

            set({
                revenusStats: {
                    total: data.total,
                    parJour,
                    parMois,
                    parMethodePaiement,
                    comparison,
                },
                isLoading: false,
                error: null,
            });

            console.log('✅ Statistiques de revenus chargées');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement des revenus';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchRevenusStats:', errorMessage);
        }
    },

    /**
     * FETCH COMMANDES STATS - Récupérer les stats de commandes
     */
    fetchCommandesStats: async () => {
        set({ isLoading: true, error: null });

        try {
            const periode = get().periode;
            const response = await fetch(`/api/analytics/commandes?periode=${periode}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des stats commandes');
            }

            const data = await response.json();

            // Transformer les données pour les graphiques
            const parStatut: PieChartData[] = Object.entries(data.parStatut).map(([statut, count]) => ({
                label: statut,
                value: count as number,
                color: getColorForStatus(statut),
            }));

            const evolutionTemps: ChartDataPoint[] = data.evolutionTemps.map((item: any) => ({
                date: formatDateForChart(item.date, periode),
                value: item.count,
            }));

            const comparison = calculateComparison(
                data.commandesCurrent,
                data.commandesPrevious
            );

            set({
                commandesStats: {
                    total: data.total,
                    parStatut,
                    evolutionTemps,
                    tauxConversion: data.tauxConversion,
                    panierMoyen: data.panierMoyen,
                    comparison,
                },
                isLoading: false,
                error: null,
            });

            console.log('✅ Statistiques de commandes chargées');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement des stats commandes';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchCommandesStats:', errorMessage);
        }
    },

    /**
     * FETCH UTILISATEURS STATS - Récupérer les stats d'utilisateurs
     */
    fetchUtilisateursStats: async () => {
        set({ isLoading: true, error: null });

        try {
            const periode = get().periode;
            const response = await fetch(`/api/analytics/utilisateurs?periode=${periode}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des stats utilisateurs');
            }

            const data = await response.json();

            const parRole: PieChartData[] = data.parRole.map((item: any) => ({
                label: item.role,
                value: item.count,
                color: getColorForRole(item.role),
            }));

            const evolutionInscriptions: ChartDataPoint[] = data.evolutionInscriptions.map((item: any) => ({
                date: formatDateForChart(item.date, periode),
                value: item.count,
            }));

            const comparison = calculateComparison(
                data.utilisateursCurrent,
                data.utilisateursPrevious
            );

            set({
                utilisateursStats: {
                    total: data.total,
                    actifs: data.actifs,
                    nouveaux: data.nouveaux,
                    parRole,
                    evolutionInscriptions,
                    tauxRetention: data.tauxRetention,
                    comparison,
                },
                isLoading: false,
                error: null,
            });

            console.log('✅ Statistiques d\'utilisateurs chargées');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement des stats utilisateurs';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchUtilisateursStats:', errorMessage);
        }
    },

    /**
     * FETCH TOP PERFORMERS - Récupérer les meilleurs performeurs
     * 
     * Cette fonction charge le classement des meilleurs articles,
     * boutiques et clients. Très utile pour identifier ce qui marche bien !
     */
    fetchTopPerformers: async () => {
        set({ isLoading: true, error: null });

        try {
            const periode = get().periode;
            const response = await fetch(`/api/analytics/top-performers?periode=${periode}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des top performers');
            }

            const data = await response.json();

            set({
                topPerformers: {
                    topArticles: data.articles,
                    topBoutiques: data.boutiques,
                    topClients: data.clients,
                },
                isLoading: false,
                error: null,
            });

            console.log('✅ Top performers chargés');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement des top performers';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchTopPerformers:', errorMessage);
        }
    },

    /**
     * SET PERIODE - Changer la période de temps
     * 
     * Quand l'admin change la période (aujourd'hui → semaine → mois),
     * on met à jour la période puis on recharge toutes les stats
     */
    setPeriode: (periode: PeriodeStats) => {
        set({ periode });

        // Recharger toutes les stats avec la nouvelle période
        get().refreshAll();

        console.log('📅 Période changée:', periode);
    },

    /**
     * REFRESH ALL - Rafraîchir toutes les statistiques
     * 
     * Cette fonction est un raccourci pour recharger toutes les stats
     * en une seule action. Utile pour un bouton "Rafraîchir" dans l'UI.
     */
    refreshAll: async () => {
        console.log('🔄 Rafraîchissement de toutes les statistiques...');

        // Exécuter toutes les fonctions de chargement en parallèle
        // Promise.all attend que toutes les promesses se terminent
        await Promise.all([
            get().fetchDashboardStats(),
            get().fetchRevenusStats(),
            get().fetchCommandesStats(),
            get().fetchUtilisateursStats(),
            get().fetchTopPerformers(),
        ]);

        console.log('✅ Toutes les statistiques ont été rafraîchies');
    },

    /**
     * CLEAR STATS - Effacer toutes les statistiques
     * 
     * Remet l'état initial. Utile lors de la déconnexion par exemple.
     */
    clearStats: () => {
        set({
            dashboardStats: null,
            revenusStats: null,
            commandesStats: null,
            utilisateursStats: null,
            topPerformers: null,
            lastUpdated: null,
            error: null,
        });

        console.log('🗑️ Statistiques effacées');
    },
}));

// ============================================
// FONCTIONS UTILITAIRES POUR LES COULEURS
// ============================================

/**
 * Retourne une couleur pour une méthode de paiement
 */
function getColorForPaymentMethod(methode: string): string {
    const colors: Record<string, string> = {
        'carte': '#4F46E5', // Indigo
        'mobile_money': '#10B981', // Vert
        'especes': '#F59E0B', // Orange
    };
    return colors[methode] || '#6B7280'; // Gris par défaut
}

/**
 * Retourne une couleur pour un statut de commande
 */
function getColorForStatus(statut: string): string {
    const colors: Record<string, string> = {
        'en_attente': '#F59E0B', // Orange
        'en_preparation': '#3B82F6', // Bleu
        'prete_pour_livraison': '#8B5CF6', // Violet
        'en_cours_de_livraison': '#6366F1', // Indigo
        'livree': '#10B981', // Vert
        'annule': '#EF4444', // Rouge
        'rembourse': '#F97316', // Orange foncé
    };
    return colors[statut] || '#6B7280';
}

/**
 * Retourne une couleur pour un rôle utilisateur
 */
function getColorForRole(role: string): string {
    const colors: Record<string, string> = {
        'client': '#3B82F6', // Bleu
        'boutique': '#10B981', // Vert
        'livreur': '#F59E0B', // Orange
        'admin': '#EF4444', // Rouge
    };
    return colors[role] || '#6B7280';
}

// ============================================
// SÉLECTEURS UTILITAIRES
// ============================================

/**
 * Vérifie si les stats sont en cours de chargement
 */
export const useStatsLoading = () => {
    return useStatsStore((state) => state.isLoading);
};

/**
 * Récupère la période actuelle
 */
export const useCurrentPeriode = () => {
    return useStatsStore((state) => state.periode);
};

/**
 * Récupère les revenus totaux
 */
export const useRevenusTotal = () => {
    return useStatsStore((state) => state.revenusStats?.total || 0);
};

/**
 * Récupère le nombre total de commandes
 */
export const useCommandesTotal = () => {
    return useStatsStore((state) => state.commandesStats?.total || 0);
};

/**
 * Récupère le nombre total d'utilisateurs
 */
export const useUtilisateursTotal = () => {
    return useStatsStore((state) => state.utilisateursStats?.total || 0);
};