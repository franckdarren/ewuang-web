// stores/commandesStore.ts
/**
 * CommandesStore - Store pour gérer toutes les commandes
 * 
 * Ce store est le cœur de votre marketplace côté admin.
 * Il permet de :
 * - Lister toutes les commandes avec pagination
 * - Filtrer les commandes (par statut, date, etc.)
 * - Voir les détails d'une commande spécifique
 * - Changer le statut d'une commande
 * - Supprimer une commande
 * - Voir les commandes d'une boutique ou d'un utilisateur
 * 
 * Note importante sur la pagination :
 * Quand vous avez beaucoup de données (imaginez 10 000 commandes),
 * vous ne voulez pas tout charger d'un coup en mémoire !
 * C'est pourquoi on utilise la pagination : on charge page par page.
 */

import { create } from 'zustand';
import {
    Commande,
    CommandeStatut,
    LoadingState,
    PaginatedResponse,
    PaginationParams,
    SearchFilters
} from './types/common';

// ============================================
// DÉFINITION DE L'INTERFACE DU STORE
// ============================================

interface CommandesState extends LoadingState {
    // -------- ÉTAT (Les données) --------

    /**
     * Liste des commandes actuellement chargées
     * C'est un tableau qui contient les commandes de la page actuelle
     */
    commandes: Commande[];

    /**
     * La commande actuellement sélectionnée
     * Utilisé quand on affiche les détails d'une commande
     */
    selectedCommande: Commande | null;

    /**
     * Informations de pagination
     */
    pagination: {
        currentPage: number;    // Page actuelle (1, 2, 3...)
        totalPages: number;     // Nombre total de pages
        totalItems: number;     // Nombre total de commandes
        itemsPerPage: number;   // Combien de commandes par page
        hasMore: boolean;       // Y a-t-il encore des pages à charger ?
    };

    /**
     * Filtres actuellement appliqués
     * Par exemple : statut="en_attente", dateFrom="2024-01-01"
     */
    filters: SearchFilters;

    /**
     * Statistiques des commandes
     * Calculées à partir des données chargées
     */
    stats: {
        total: number;
        parStatut: Record<CommandeStatut, number>;
        montantTotal: number;
        montantMoyen: number;
    };

    // -------- ACTIONS --------

    /**
     * Récupère la liste des commandes avec pagination
     * @param params - Paramètres de pagination (page, limit, etc.)
     */
    fetchCommandes: (params?: PaginationParams) => Promise<void>;

    /**
     * Récupère les détails d'une commande spécifique
     * @param id - ID de la commande
     */
    fetchCommandeDetails: (id: string) => Promise<void>;

    /**
     * Met à jour le statut d'une commande
     * @param id - ID de la commande
     * @param nouveauStatut - Le nouveau statut à appliquer
     */
    updateStatut: (id: string, nouveauStatut: CommandeStatut) => Promise<void>;

    /**
     * Supprime une commande
     * @param id - ID de la commande à supprimer
     */
    deleteCommande: (id: string) => Promise<void>;

    /**
     * Applique des filtres à la liste des commandes
     * @param filters - Les filtres à appliquer
     */
    setFilters: (filters: SearchFilters) => void;

    /**
     * Efface tous les filtres
     */
    clearFilters: () => void;

    /**
     * Recharge les commandes (utile après une modification)
     */
    refresh: () => Promise<void>;

    /**
     * Désélectionne la commande actuellement sélectionnée
     */
    clearSelectedCommande: () => void;

    /**
     * Calcule les statistiques des commandes chargées
     */
    calculateStats: () => void;
}

// ============================================
// CRÉATION DU STORE
// ============================================

export const useCommandesStore = create<CommandesState>((set, get) => ({
    // -------- ÉTAT INITIAL --------
    commandes: [],
    selectedCommande: null,
    isLoading: false,
    error: null,

    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20, // Par défaut, 20 commandes par page
        hasMore: false,
    },

    filters: {},

    stats: {
        total: 0,
        parStatut: {
            [CommandeStatut.EN_ATTENTE]: 0,
            [CommandeStatut.EN_PREPARATION]: 0,
            [CommandeStatut.PRETE_POUR_LIVRAISON]: 0,
            [CommandeStatut.EN_COURS_DE_LIVRAISON]: 0,
            [CommandeStatut.LIVREE]: 0,
            [CommandeStatut.ANNULE]: 0,
            [CommandeStatut.REMBOURSE]: 0,
        },
        montantTotal: 0,
        montantMoyen: 0,
    },

    // -------- IMPLÉMENTATION DES ACTIONS --------

    /**
     * FETCH COMMANDES - Récupérer la liste des commandes
     * 
     * Cette fonction gère la pagination et les filtres.
     * Elle construit l'URL avec les paramètres appropriés
     * et met à jour le store avec les résultats.
     */
    fetchCommandes: async (params = {}) => {
        set({ isLoading: true, error: null });

        try {
            // Récupérer les filtres actuels du store
            const currentFilters = get().filters;
            const currentPage = params.page || get().pagination.currentPage;
            const limit = params.limit || get().pagination.itemsPerPage;

            // Construire l'URL avec les paramètres de query
            // URLSearchParams est un objet JavaScript qui aide à construire des URLs
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
                ...currentFilters, // Ajouter tous les filtres
            });

            // Appeler l'API
            const response = await fetch(`/api/commandes/list?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des commandes');
            }

            // Type de la réponse attendue
            const data: PaginatedResponse<Commande> = await response.json();

            // Mettre à jour le store avec les nouvelles données
            set({
                commandes: data.data,
                pagination: {
                    currentPage: data.page,
                    totalPages: Math.ceil(data.total / limit),
                    totalItems: data.total,
                    itemsPerPage: limit,
                    hasMore: data.hasMore,
                },
                isLoading: false,
                error: null,
            });

            // Recalculer les statistiques
            get().calculateStats();

            console.log(`✅ ${data.data.length} commandes chargées (page ${data.page}/${Math.ceil(data.total / limit)})`);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur inattendue lors du chargement';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchCommandes:', errorMessage);
        }
    },

    /**
     * FETCH COMMANDE DETAILS - Récupérer les détails d'une commande
     * 
     * Cette fonction charge une commande complète avec toutes ses relations :
     * - Les articles de la commande
     * - L'acheteur et le vendeur
     * - La livraison associée
     * - Le paiement
     */
    fetchCommandeDetails: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            // Appeler l'API pour récupérer la commande complète
            const response = await fetch(`/api/commandes/${id}`);

            if (!response.ok) {
                throw new Error('Commande introuvable');
            }

            const commande: Commande = await response.json();

            // Stocker cette commande comme la commande sélectionnée
            set({
                selectedCommande: commande,
                isLoading: false,
                error: null,
            });

            console.log('✅ Détails de la commande chargés:', commande.numero);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur lors du chargement des détails';

            set({
                error: errorMessage,
                isLoading: false,
                selectedCommande: null,
            });

            console.error('❌ Erreur fetchCommandeDetails:', errorMessage);
        }
    },

    /**
     * UPDATE STATUT - Changer le statut d'une commande
     * 
     * Cette fonction est très importante pour un admin.
     * Elle permet de faire avancer une commande dans son cycle de vie :
     * en_attente → en_preparation → prete_pour_livraison → etc.
     * 
     * Note : On met à jour localement ET côté serveur
     * pour garder la cohérence des données
     */
    updateStatut: async (id: string, nouveauStatut: CommandeStatut) => {
        set({ isLoading: true, error: null });

        try {
            // Appeler l'API pour mettre à jour le statut
            const response = await fetch(`/api/commandes/${id}/update-status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ statut: nouveauStatut }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur de mise à jour du statut');
            }

            const commandeMiseAJour: Commande = await response.json();

            // Mettre à jour la commande dans la liste locale
            const commandesActuelles = get().commandes;
            const nouvellesCommandes = commandesActuelles.map(cmd =>
                cmd.id === id ? commandeMiseAJour : cmd
            );

            // Si c'était la commande sélectionnée, la mettre à jour aussi
            const selectedCommande = get().selectedCommande;
            const newSelectedCommande = selectedCommande?.id === id
                ? commandeMiseAJour
                : selectedCommande;

            set({
                commandes: nouvellesCommandes,
                selectedCommande: newSelectedCommande,
                isLoading: false,
                error: null,
            });

            // Recalculer les stats car le statut a changé
            get().calculateStats();

            console.log(`✅ Statut de la commande ${commandeMiseAJour.numero} mis à jour:`, nouveauStatut);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de mise à jour du statut';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur updateStatut:', errorMessage);
            throw error;
        }
    },

    /**
     * DELETE COMMANDE - Supprimer une commande
     * 
     * Attention : Cette action est irréversible !
     * Dans une vraie application, vous voudrez peut-être
     * demander une confirmation à l'utilisateur avant d'appeler cette fonction.
     */
    deleteCommande: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`/api/commandes/${id}/delete`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            // Retirer la commande de la liste locale
            const nouvellesCommandes = get().commandes.filter(cmd => cmd.id !== id);

            // Si c'était la commande sélectionnée, la désélectionner
            const selectedCommande = get().selectedCommande;
            const newSelectedCommande = selectedCommande?.id === id
                ? null
                : selectedCommande;

            set({
                commandes: nouvellesCommandes,
                selectedCommande: newSelectedCommande,
                isLoading: false,
                error: null,
            });

            // Recalculer les stats
            get().calculateStats();

            console.log('✅ Commande supprimée avec succès');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de suppression';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur deleteCommande:', errorMessage);
            throw error;
        }
    },

    /**
     * SET FILTERS - Appliquer des filtres
     * 
     * Quand vous appliquez des filtres, on les stocke
     * puis on recharge les commandes avec ces nouveaux filtres
     */
    setFilters: (filters: SearchFilters) => {
        set({ filters });

        // Recharger les commandes avec les nouveaux filtres
        // On repart à la page 1 car les résultats seront différents
        get().fetchCommandes({ page: 1 });

        console.log('🔍 Filtres appliqués:', filters);
    },

    /**
     * CLEAR FILTERS - Effacer tous les filtres
     * 
     * Remet les filtres à zéro et recharge les commandes
     */
    clearFilters: () => {
        set({ filters: {} });
        get().fetchCommandes({ page: 1 });

        console.log('🔍 Filtres effacés');
    },

    /**
     * REFRESH - Recharger les commandes
     * 
     * Simple raccourci pour recharger la page actuelle
     * Utile après une modification
     */
    refresh: async () => {
        await get().fetchCommandes({ page: get().pagination.currentPage });
    },

    /**
     * CLEAR SELECTED COMMANDE - Désélectionner la commande actuelle
     */
    clearSelectedCommande: () => {
        set({ selectedCommande: null });
    },

    /**
     * CALCULATE STATS - Calculer les statistiques
     * 
     * Cette fonction parcourt toutes les commandes chargées
     * et calcule diverses statistiques utiles pour le dashboard
     * 
     * Note : Ces stats sont calculées sur les données EN MÉMOIRE,
     * pas sur toutes les commandes de la base de données.
     * Pour des stats globales précises, vous devriez avoir une API dédiée.
     */
    calculateStats: () => {
        const commandes = get().commandes;

        // Initialiser les compteurs par statut
        const parStatut: Record<CommandeStatut, number> = {
            [CommandeStatut.EN_ATTENTE]: 0,
            [CommandeStatut.EN_PREPARATION]: 0,
            [CommandeStatut.PRETE_POUR_LIVRAISON]: 0,
            [CommandeStatut.EN_COURS_DE_LIVRAISON]: 0,
            [CommandeStatut.LIVREE]: 0,
            [CommandeStatut.ANNULE]: 0,
            [CommandeStatut.REMBOURSE]: 0,
        };

        let montantTotal = 0;

        // Parcourir toutes les commandes
        commandes.forEach(commande => {
            // Compter par statut
            parStatut[commande.statut]++;

            // Additionner les montants
            montantTotal += commande.prix;
        });

        // Calculer le montant moyen
        const montantMoyen = commandes.length > 0
            ? montantTotal / commandes.length
            : 0;

        // Mettre à jour les stats dans le store
        set({
            stats: {
                total: commandes.length,
                parStatut,
                montantTotal,
                montantMoyen,
            },
        });

        console.log('📊 Statistiques calculées:', {
            total: commandes.length,
            montantTotal,
            montantMoyen: montantMoyen.toFixed(2),
        });
    },
}));

// ============================================
// SÉLECTEURS UTILITAIRES
// ============================================

/**
 * Récupère uniquement les commandes en attente
 * Utile pour afficher une liste des commandes qui nécessitent une action
 */
export const useCommandesEnAttente = () => {
    return useCommandesStore((state) =>
        state.commandes.filter(cmd => cmd.statut === CommandeStatut.EN_ATTENTE)
    );
};

/**
 * Récupère le nombre de commandes en attente
 */
export const useCommandesEnAttenteCount = () => {
    return useCommandesStore((state) =>
        state.commandes.filter(cmd => cmd.statut === CommandeStatut.EN_ATTENTE).length
    );
};

/**
 * Récupère les commandes du jour
 */
export const useCommandesDuJour = () => {
    return useCommandesStore((state) => {
        const aujourdhui = new Date().toISOString().split('T')[0];
        return state.commandes.filter(cmd =>
            cmd.created_at.startsWith(aujourdhui)
        );
    });
};

/**
 * Vérifie si des commandes sont en cours de chargement
 */
export const useCommandesLoading = () => {
    return useCommandesStore((state) => state.isLoading);
};

/**
 * Récupère l'erreur actuelle s'il y en a une
 */
export const useCommandesError = () => {
    return useCommandesStore((state) => state.error);
};