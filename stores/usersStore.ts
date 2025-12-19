// stores/usersStore.ts
/**
 * UsersStore - Store pour gérer tous les utilisateurs
 * 
 * Ce store gère les trois types d'utilisateurs de votre marketplace :
 * - Clients : les acheteurs
 * - Boutiques : les vendeurs
 * - Livreurs : ceux qui livrent les commandes
 * 
 * Un admin doit pouvoir :
 * - Voir la liste de tous les utilisateurs
 * - Filtrer par rôle (client, boutique, livreur)
 * - Voir les détails d'un utilisateur
 * - Activer/désactiver un compte
 * - Vérifier un compte
 * - Supprimer un utilisateur
 */

import { create } from 'zustand';
import {
    User,
    LoadingState,
    PaginatedResponse,
    PaginationParams,
    SearchFilters
} from './types/common';

// ============================================
// TYPES SPÉCIFIQUES AU STORE USERS
// ============================================

/**
 * Type de rôle utilisateur
 */
export type UserRole = 'client' | 'boutique' | 'livreur' | 'admin';

/**
 * Filtres spécifiques aux utilisateurs
 */
interface UserFilters extends SearchFilters {
    role?: UserRole;
    is_verified?: boolean;
    is_active?: boolean;
    dateInscriptionFrom?: string;
    dateInscriptionTo?: string;
}

/**
 * Statistiques d'un utilisateur
 * Utilisé pour afficher un profil détaillé
 */
interface UserStats {
    // Pour une boutique
    totalVentes?: number;
    revenuTotal?: number;
    nombreArticles?: number;
    notesMoyennes?: number;

    // Pour un client
    totalAchats?: number;
    montantDepense?: number;
    commandesEnCours?: number;

    // Pour un livreur
    livraisonsEffectuees?: number;
    livraisonsEnCours?: number;
    tauxReussite?: number;
}

// ============================================
// DÉFINITION DE L'INTERFACE DU STORE
// ============================================

interface UsersState extends LoadingState {
    // -------- ÉTAT (Les données) --------

    /**
     * Liste des utilisateurs actuellement chargés
     */
    users: User[];

    /**
     * L'utilisateur actuellement sélectionné (pour voir les détails)
     */
    selectedUser: User | null;

    /**
     * Statistiques de l'utilisateur sélectionné
     */
    selectedUserStats: UserStats | null;

    /**
     * Informations de pagination
     */
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasMore: boolean;
    };

    /**
     * Filtres actuellement appliqués
     */
    filters: UserFilters;

    /**
     * Statistiques globales des utilisateurs
     */
    stats: {
        total: number;
        parRole: Record<UserRole, number>;
        actifs: number;
        verifies: number;
        nouveauxCeMois: number;
    };

    // -------- ACTIONS --------

    /**
     * Récupère la liste des utilisateurs
     */
    fetchUsers: (params?: PaginationParams) => Promise<void>;

    /**
     * Récupère les détails d'un utilisateur
     */
    fetchUserDetails: (id: string) => Promise<void>;

    /**
     * Récupère les statistiques d'un utilisateur
     */
    fetchUserStats: (id: string) => Promise<void>;

    /**
     * Active ou désactive un compte utilisateur
     */
    toggleUserActive: (id: string, isActive: boolean) => Promise<void>;

    /**
     * Vérifie ou dé-vérifie un compte
     */
    toggleUserVerified: (id: string, isVerified: boolean) => Promise<void>;

    /**
     * Supprime un utilisateur
     */
    deleteUser: (id: string) => Promise<void>;

    /**
     * Met à jour un utilisateur
     */
    updateUser: (id: string, updates: Partial<User>) => Promise<void>;

    /**
     * Applique des filtres
     */
    setFilters: (filters: UserFilters) => void;

    /**
     * Efface les filtres
     */
    clearFilters: () => void;

    /**
     * Rafraîchit la liste
     */
    refresh: () => Promise<void>;

    /**
     * Désélectionne l'utilisateur actuel
     */
    clearSelectedUser: () => void;

    /**
     * Calcule les statistiques
     */
    calculateStats: () => void;
}

// ============================================
// CRÉATION DU STORE
// ============================================

export const useUsersStore = create<UsersState>((set, get) => ({
    // -------- ÉTAT INITIAL --------
    users: [],
    selectedUser: null,
    selectedUserStats: null,
    isLoading: false,
    error: null,

    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
        hasMore: false,
    },

    filters: {},

    stats: {
        total: 0,
        parRole: {
            client: 0,
            boutique: 0,
            livreur: 0,
            admin: 0,
        },
        actifs: 0,
        verifies: 0,
        nouveauxCeMois: 0,
    },

    // -------- IMPLÉMENTATION DES ACTIONS --------

    /**
     * FETCH USERS - Récupérer la liste des utilisateurs
     * 
     * Cette fonction charge les utilisateurs avec pagination et filtres.
     * Elle construit l'URL avec tous les paramètres nécessaires.
     */
    fetchUsers: async (params = {}) => {
        set({ isLoading: true, error: null });

        try {
            const currentFilters = get().filters;
            const currentPage = params.page || get().pagination.currentPage;
            const limit = params.limit || get().pagination.itemsPerPage;

            // Construire les paramètres de requête
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
                ...currentFilters,
            });

            const response = await fetch(`/api/users/list?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des utilisateurs');
            }

            const data: PaginatedResponse<User> = await response.json();

            set({
                users: data.data,
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

            // Recalculer les stats
            get().calculateStats();

            console.log(`✅ ${data.data.length} utilisateurs chargés`);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchUsers:', errorMessage);
        }
    },

    /**
     * FETCH USER DETAILS - Récupérer les détails d'un utilisateur
     * 
     * Charge un utilisateur complet avec toutes ses informations
     */
    fetchUserDetails: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`/api/users/${id}`);

            if (!response.ok) {
                throw new Error('Utilisateur introuvable');
            }

            const user: User = await response.json();

            set({
                selectedUser: user,
                isLoading: false,
                error: null,
            });

            // Charger aussi les statistiques de cet utilisateur
            await get().fetchUserStats(id);

            console.log('✅ Détails utilisateur chargés:', user.email);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement des détails';

            set({
                error: errorMessage,
                isLoading: false,
                selectedUser: null,
            });

            console.error('❌ Erreur fetchUserDetails:', errorMessage);
        }
    },

    /**
     * FETCH USER STATS - Récupérer les statistiques d'un utilisateur
     * 
     * Les statistiques varient selon le rôle de l'utilisateur.
     * Une boutique aura des stats de ventes, un client des stats d'achats, etc.
     */
    fetchUserStats: async (id: string) => {
        try {
            const user = get().selectedUser;

            if (!user) {
                console.warn('⚠️ Impossible de charger les stats sans utilisateur sélectionné');
                return;
            }

            // L'endpoint varie selon le rôle
            let endpoint = '';

            if (user.role === 'boutique') {
                endpoint = `/api/users/${id}/stats-boutique`;
            } else if (user.role === 'client') {
                endpoint = `/api/users/${id}/stats-client`;
            } else if (user.role === 'livreur') {
                endpoint = `/api/users/${id}/stats-livreur`;
            } else {
                // Admin ou autre rôle sans stats spécifiques
                return;
            }

            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des statistiques');
            }

            const stats: UserStats = await response.json();

            set({
                selectedUserStats: stats,
            });

            console.log('✅ Statistiques utilisateur chargées');

        } catch (error) {
            console.error('❌ Erreur fetchUserStats:', error);
            // On ne bloque pas l'UI si les stats ne chargent pas
            set({ selectedUserStats: null });
        }
    },

    /**
     * TOGGLE USER ACTIVE - Activer/Désactiver un compte
     * 
     * Un compte désactivé ne peut plus se connecter ni effectuer d'actions.
     * Utile pour suspendre temporairement un utilisateur problématique.
     */
    toggleUserActive: async (id: string, isActive: boolean) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`/api/users/update`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, is_active: isActive }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour');
            }

            const updatedUser: User = await response.json();

            // Mettre à jour dans la liste locale
            const nouvelleListeUsers = get().users.map(u =>
                u.id === id ? updatedUser : u
            );

            // Mettre à jour l'utilisateur sélectionné si c'est lui
            const selectedUser = get().selectedUser;
            const newSelectedUser = selectedUser?.id === id ? updatedUser : selectedUser;

            set({
                users: nouvelleListeUsers,
                selectedUser: newSelectedUser,
                isLoading: false,
                error: null,
            });

            console.log(`✅ Compte ${isActive ? 'activé' : 'désactivé'}`);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de mise à jour';

            set({
                error: errorMessage,
                isLoading: false,
            });

            throw error;
        }
    },

    /**
     * TOGGLE USER VERIFIED - Vérifier/Dé-vérifier un compte
     * 
     * Un compte vérifié indique que l'admin a validé que c'est un vrai utilisateur.
     * Peut donner accès à des fonctionnalités premium ou inspirer confiance.
     */
    toggleUserVerified: async (id: string, isVerified: boolean) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`/api/users/update`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, is_verified: isVerified }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la vérification');
            }

            const updatedUser: User = await response.json();

            const nouvelleListeUsers = get().users.map(u =>
                u.id === id ? updatedUser : u
            );

            const selectedUser = get().selectedUser;
            const newSelectedUser = selectedUser?.id === id ? updatedUser : selectedUser;

            set({
                users: nouvelleListeUsers,
                selectedUser: newSelectedUser,
                isLoading: false,
                error: null,
            });

            console.log(`✅ Compte ${isVerified ? 'vérifié' : 'non vérifié'}`);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de vérification';

            set({
                error: errorMessage,
                isLoading: false,
            });

            throw error;
        }
    },

    /**
     * DELETE USER - Supprimer un utilisateur
     * 
     * ATTENTION : Action irréversible !
     * Supprime l'utilisateur et toutes ses données associées.
     */
    deleteUser: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`/api/users/delete/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            // Retirer de la liste locale
            const nouvelleListeUsers = get().users.filter(u => u.id !== id);

            // Désélectionner si c'était l'utilisateur sélectionné
            const selectedUser = get().selectedUser;
            const newSelectedUser = selectedUser?.id === id ? null : selectedUser;

            set({
                users: nouvelleListeUsers,
                selectedUser: newSelectedUser,
                selectedUserStats: newSelectedUser ? get().selectedUserStats : null,
                isLoading: false,
                error: null,
            });

            // Recalculer les stats
            get().calculateStats();

            console.log('✅ Utilisateur supprimé');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de suppression';

            set({
                error: errorMessage,
                isLoading: false,
            });

            throw error;
        }
    },

    /**
     * UPDATE USER - Mettre à jour un utilisateur
     * 
     * Permet de modifier les informations d'un utilisateur
     * (nom, email, téléphone, adresse, etc.)
     */
    updateUser: async (id: string, updates: Partial<User>) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`/api/users/update`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, ...updates }),
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour');
            }

            const updatedUser: User = await response.json();

            const nouvelleListeUsers = get().users.map(u =>
                u.id === id ? updatedUser : u
            );

            const selectedUser = get().selectedUser;
            const newSelectedUser = selectedUser?.id === id ? updatedUser : selectedUser;

            set({
                users: nouvelleListeUsers,
                selectedUser: newSelectedUser,
                isLoading: false,
                error: null,
            });

            console.log('✅ Utilisateur mis à jour');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de mise à jour';

            set({
                error: errorMessage,
                isLoading: false,
            });

            throw error;
        }
    },

    /**
     * SET FILTERS - Appliquer des filtres
     */
    setFilters: (filters: UserFilters) => {
        set({ filters });
        get().fetchUsers({ page: 1 });
        console.log('🔍 Filtres utilisateurs appliqués:', filters);
    },

    /**
     * CLEAR FILTERS - Effacer les filtres
     */
    clearFilters: () => {
        set({ filters: {} });
        get().fetchUsers({ page: 1 });
        console.log('🔍 Filtres utilisateurs effacés');
    },

    /**
     * REFRESH - Recharger la liste
     */
    refresh: async () => {
        await get().fetchUsers({ page: get().pagination.currentPage });
    },

    /**
     * CLEAR SELECTED USER - Désélectionner
     */
    clearSelectedUser: () => {
        set({
            selectedUser: null,
            selectedUserStats: null,
        });
    },

    /**
     * CALCULATE STATS - Calculer les statistiques
     * 
     * Parcourt les utilisateurs chargés et calcule les stats
     */
    calculateStats: () => {
        const users = get().users;

        const parRole: Record<UserRole, number> = {
            client: 0,
            boutique: 0,
            livreur: 0,
            admin: 0,
        };

        let actifs = 0;
        let verifies = 0;
        let nouveauxCeMois = 0;

        const maintenant = new Date();
        const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

        users.forEach(user => {
            // Compter par rôle
            parRole[user.role as UserRole]++;

            // Compter les actifs
            if (user.is_active) actifs++;

            // Compter les vérifiés
            if (user.is_verified) verifies++;

            // Compter les nouveaux ce mois
            const dateCreation = new Date(user.created_at);
            if (dateCreation >= debutMois) nouveauxCeMois++;
        });

        set({
            stats: {
                total: users.length,
                parRole,
                actifs,
                verifies,
                nouveauxCeMois,
            },
        });

        console.log('📊 Stats utilisateurs calculées');
    },
}));

// ============================================
// SÉLECTEURS UTILITAIRES
// ============================================

/**
 * Récupère uniquement les boutiques
 */
export const useBoutiques = () => {
    return useUsersStore((state) =>
        state.users.filter(u => u.role === 'boutique')
    );
};

/**
 * Récupère uniquement les clients
 */
export const useClients = () => {
    return useUsersStore((state) =>
        state.users.filter(u => u.role === 'client')
    );
};

/**
 * Récupère uniquement les livreurs
 */
export const useLivreurs = () => {
    return useUsersStore((state) =>
        state.users.filter(u => u.role === 'livreur')
    );
};

/**
 * Compte les utilisateurs actifs
 */
export const useActiveUsersCount = () => {
    return useUsersStore((state) => state.stats.actifs);
};

/**
 * Compte les boutiques vérifiées
 */
export const useVerifiedBoutiquesCount = () => {
    return useUsersStore((state) => {
        return state.users.filter(u =>
            u.role === 'boutique' && u.is_verified
        ).length;
    });
};