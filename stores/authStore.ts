// stores/authStore.ts
/**
 * AuthStore - Adapté pour votre projet avec Supabase
 * 
 * IMPORTANT : Ce store fonctionne côté CLIENT uniquement
 * L'initialisation se fait via le AuthProvider qui reçoit les données du serveur
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

/**
 * Interface User adaptée à votre schéma de base de données
 * Correspond aux colonnes de votre table users
 */
export interface User {
    // Données de base
    id: string;                    // UUID de la table users
    auth_id: string | null;        // UUID de Supabase Auth
    name: string;
    email: string;
    role: 'Client' | 'Boutique' | 'Livreur' | 'Administrateur';

    // Informations complémentaires
    url_logo: string | null;       // Avatar/Logo
    phone: string | null;
    address: string | null;
    description: string | null;

    // Pour les boutiques
    heure_ouverture: string | null;
    heure_fermeture: string | null;

    // Status
    solde: number;
    is_verified: boolean;
    is_active: boolean;

    // Timestamps
    created_at: string;
    updated_at: string;
}

/**
 * Interface de l'état du store
 */
interface AuthState {
    // -------- ÉTAT --------
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;  // Nouveau : indique si le store a été initialisé

    // -------- ACTIONS --------

    /**
     * Initialise le store avec les données utilisateur du serveur
     * Appelé une seule fois au montage de l'application
     */
    initializeAuth: (user: User, token: string) => void;

    /**
     * Met à jour uniquement l'utilisateur (sans toucher au token)
     * Utile après une modification du profil
     */
    setUser: (user: User) => void;

    /**
     * Déconnexion complète
     */
    logout: () => Promise<void>;

    /**
     * Met à jour le profil utilisateur
     */
    updateProfile: (updates: Partial<User>) => Promise<void>;

    /**
     * Rafraîchit les données utilisateur depuis l'API
     */
    refreshUser: () => Promise<void>;

    /**
     * Récupère un access_token frais depuis le serveur (qui rafraîchit la
     * session via le cookie) et le met à jour dans le store.
     * Retourne le nouveau token, ou null si la session est définitivement
     * expirée (auquel cas l'utilisateur est déconnecté).
     */
    refreshAccessToken: () => Promise<string | null>;

    /**
     * Efface les erreurs
     */
    clearError: () => void;

    /**
     * Réinitialise complètement le store
     */
    reset: () => void;
}

// ============================================
// CRÉATION DU STORE
// ============================================

// Promesse partagée pour dédupliquer les rafraîchissements concurrents
let inFlightRefresh: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // -------- ÉTAT INITIAL --------
            user: null,
            token: null,
            isLoading: false,
            error: null,
            isAuthenticated: false,
            isInitialized: false,

            // -------- ACTIONS --------

            /**
             * INITIALIZE AUTH - Initialiser avec les données du serveur
             * 
             * Cette fonction est appelée UNE SEULE FOIS par le AuthProvider
             * quand l'application démarre et que le layout a récupéré les données
             */
            initializeAuth: (user: User, token: string) => {
                // console.log('🔐 Initialisation de l\'authentification:', user.email);

                set({
                    user,
                    token,
                    isAuthenticated: true,
                    isInitialized: true,
                    error: null,
                });
            },

            /**
             * SET USER - Mettre à jour uniquement l'utilisateur
             * 
             * Utilisé quand on met à jour le profil sans changer le token
             */
            setUser: (user: User) => {
                // console.log('👤 Mise à jour de l\'utilisateur:', user.email);

                set({
                    user,
                    isAuthenticated: true,
                });
            },

            /**
             * LOGOUT - Déconnexion
             * 
             * Déconnecte l'utilisateur de Supabase ET efface le store local
             */
            logout: async () => {
                set({ isLoading: true });

                try {
                    // Appeler l'API de déconnexion Supabase
                    const response = await fetch('/api/auth/logout', {
                        method: 'POST',
                    });

                    if (!response.ok) {
                        throw new Error('Erreur lors de la déconnexion');
                    }

                    // Réinitialiser complètement le store
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isInitialized: false,
                        isLoading: false,
                        error: null,
                    });

                    console.log('✅ Déconnexion réussie');

                    // Rediriger vers la page de connexion
                    window.location.href = '/login';

                } catch (error) {
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Erreur de déconnexion';

                    set({
                        error: errorMessage,
                        isLoading: false,
                    });

                    console.error('❌ Erreur de déconnexion:', errorMessage);
                }
            },

            /**
             * UPDATE PROFILE - Mettre à jour le profil
             * 
             * Appelle votre API /api/users/update et met à jour le store local
             */
            updateProfile: async (updates: Partial<User>) => {
                const currentUser = get().user;

                if (!currentUser) {
                    throw new Error('Aucun utilisateur connecté');
                }

                set({ isLoading: true, error: null });

                try {
                    const response = await fetch('/api/users/update', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${get().token}`,
                        },
                        body: JSON.stringify({
                            id: currentUser.id,
                            ...updates,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Erreur de mise à jour');
                    }

                    const updatedUser: User = await response.json();

                    // Mettre à jour l'utilisateur dans le store
                    set({
                        user: updatedUser,
                        isLoading: false,
                        error: null,
                    });

                    console.log('✅ Profil mis à jour avec succès');

                } catch (error) {
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Erreur de mise à jour du profil';

                    set({
                        error: errorMessage,
                        isLoading: false,
                    });

                    throw error;
                }
            },

            /**
             * REFRESH USER - Recharger les données utilisateur
             * 
             * Utile quand vous savez que les données ont changé côté serveur
             */
            refreshUser: async () => {
                const currentUser = get().user;

                if (!currentUser) {
                    console.warn('⚠️ Impossible de rafraîchir : aucun utilisateur connecté');
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(`/api/users/${currentUser.id}`, {
                        headers: {
                            'Authorization': `Bearer ${get().token}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error('Erreur lors du rafraîchissement');
                    }

                    const updatedUser: User = await response.json();

                    set({
                        user: updatedUser,
                        isLoading: false,
                        error: null,
                    });

                    console.log('✅ Données utilisateur rafraîchies');

                } catch (error) {
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Erreur de rafraîchissement';

                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                }
            },

            /**
             * REFRESH ACCESS TOKEN - Obtenir un token frais depuis le serveur
             *
             * Les appels concurrents (ex: plusieurs requêtes qui prennent un
             * 401 en même temps) sont dédupliqués via une promesse partagée.
             */
            refreshAccessToken: async () => {
                if (inFlightRefresh) return inFlightRefresh;

                inFlightRefresh = (async () => {
                    try {
                        const res = await fetch('/api/auth/session', {
                            method: 'GET',
                            cache: 'no-store',
                        });

                        if (!res.ok) {
                            // Session définitivement morte → déconnexion propre
                            if (res.status === 401) {
                                set({
                                    user: null,
                                    token: null,
                                    isAuthenticated: false,
                                });
                                if (typeof window !== 'undefined') {
                                    window.location.href = '/login';
                                }
                            }
                            return null;
                        }

                        const { access_token } = await res.json();
                        if (!access_token) return null;

                        set({ token: access_token, isAuthenticated: true });
                        return access_token as string;
                    } catch {
                        return null;
                    } finally {
                        inFlightRefresh = null;
                    }
                })();

                return inFlightRefresh;
            },

            /**
             * CLEAR ERROR - Effacer les erreurs
             */
            clearError: () => {
                set({ error: null });
            },

            /**
             * RESET - Réinitialiser complètement le store
             */
            reset: () => {
                set({
                    user: null,
                    token: null,
                    isLoading: false,
                    error: null,
                    isAuthenticated: false,
                    isInitialized: false,
                });
            },
        }),
        {
            name: 'auth-storage',

            // Ne persister que les données essentielles
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                isInitialized: state.isInitialized,
            }),
        }
    )
);

// ============================================
// SÉLECTEURS UTILITAIRES
// ============================================

/**
 * Vérifie si l'utilisateur est admin
 */
export const useIsAdmin = () => {
    return useAuthStore((state) => state.user?.role === 'Administrateur');
};

/**
 * Vérifie si l'utilisateur est une boutique
 */
export const useIsBoutique = () => {
    return useAuthStore((state) => state.user?.role === 'Boutique');
};

/**
 * Vérifie si l'utilisateur est un livreur
 */
export const useIsLivreur = () => {
    return useAuthStore((state) => state.user?.role === 'Livreur');
};

/**
 * Vérifie si l'utilisateur est un client
 */
export const useIsClient = () => {
    return useAuthStore((state) => state.user?.role === 'Client');
};

/**
 * Récupère uniquement le token
 */
export const useToken = () => {
    return useAuthStore((state) => state.token);
};

/**
 * Récupère l'ID de l'utilisateur
 */
export const useUserId = () => {
    return useAuthStore((state) => state.user?.id);
};

/**
 * Récupère le nom de l'utilisateur
 */
export const useUserName = () => {
    return useAuthStore((state) => state.user?.name);
};

/**
 * Récupère l'email de l'utilisateur
 */
export const useUserEmail = () => {
    return useAuthStore((state) => state.user?.email);
};

/**
 * Vérifie si le compte est vérifié
 */
export const useIsVerified = () => {
    return useAuthStore((state) => state.user?.is_verified || false);
};

/**
 * Vérifie si le compte est actif
 */
export const useIsActive = () => {
    return useAuthStore((state) => state.user?.is_active || false);
};