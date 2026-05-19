// stores/publicitesStore.ts
/**
 * PublicitesStore - Store pour gérer les publicités de la marketplace
 * 
 * 🔒 SÉCURITÉ :
 * - Toutes les opérations nécessitent un token Bearer
 * - L'utilisateur doit avoir le rôle "Administrateur"
 * - Le token est récupéré automatiquement depuis authStore
 * 
 * 📋 FONCTIONNALITÉS :
 * - CRUD complet sur les publicités
 * - Gestion de l'activation/désactivation
 * - Filtrage par statut et période
 * - Statistiques en temps réel
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { useAuthStore } from './authStore';
import { apiFetch } from '@/app/lib/apiFetch';

// ============================================
// TYPES
// ============================================

export interface Publicite {
    id: string;
    date_start: string;
    date_end: string;
    titre: string;
    url_image: string;
    lien: string;
    description: string;
    is_actif: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreatePubliciteInput {
    date_start: string;
    date_end: string;
    titre: string;
    url_image: string;
    lien: string;
    description: string;
    is_actif?: boolean;
}

export interface UpdatePubliciteInput {
    date_start?: string;
    date_end?: string;
    titre?: string;
    url_image?: string;
    lien?: string;
    description?: string;
    is_actif?: boolean;
}

export interface PubliciteFilters {
    is_actif?: boolean;
    en_cours?: boolean; // Publicités dont la période est active
    a_venir?: boolean;  // Publicités qui commencent dans le futur
    expirees?: boolean; // Publicités dont la période est passée
    search?: string;    // Recherche par titre
}

interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

export interface PubliciteStats {
    total: number;
    actives: number;
    inactives: number;
    en_cours: number;
    a_venir: number;
    expirees: number;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface PublicitesState extends LoadingState {
    publicites: Publicite[];
    selectedPublicite: Publicite | null;
    currentFilters: PubliciteFilters;

    stats: PubliciteStats;

    // Propriétés calculées
    publicitesActives: () => Publicite[];
    publicitesEnCours: () => Publicite[];
    publicitesAVenir: () => Publicite[];
    publicitesExpirees: () => Publicite[];

    // Actions CRUD
    fetchPublicites: (filters?: PubliciteFilters) => Promise<void>;
    fetchPubliciteById: (id: string) => Promise<void>;
    createPublicite: (data: CreatePubliciteInput) => Promise<Publicite>;
    updatePublicite: (id: string, data: UpdatePubliciteInput) => Promise<Publicite>;
    deletePublicite: (id: string) => Promise<void>;
    togglePubliciteActive: (id: string, isActif: boolean) => Promise<void>;

    // Actions utilitaires
    setSelectedPublicite: (publicite: Publicite | null) => void;
    setFilters: (filters: PubliciteFilters) => void;
    resetFilters: () => void;
    clearError: () => void;
    calculateStats: () => void;
    refresh: () => Promise<void>;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Récupère le token d'authentification
 */
function getAuthToken(): string {
    const token = useAuthStore.getState().token;

    if (!token) {
        throw new Error('Non authentifié. Veuillez vous connecter.');
    }

    return token;
}

/**
 * Vérifie le rôle administrateur
 */
function checkAdminRole(): void {
    const user = useAuthStore.getState().user;

    if (!user) {
        throw new Error('Non authentifié. Veuillez vous connecter.');
    }

    if (user.role !== 'Administrateur') {
        throw new Error(
            `Accès refusé. Cette action nécessite les privilèges administrateur. Votre rôle actuel : ${user.role}`
        );
    }
}

/**
 * Vérifie si une publicité est en cours
 */
function isEnCours(publicite: Publicite): boolean {
    const now = new Date();
    const start = new Date(publicite.date_start);
    const end = new Date(publicite.date_end);

    return now >= start && now <= end && publicite.is_actif;
}

/**
 * Vérifie si une publicité est à venir
 */
function isAVenir(publicite: Publicite): boolean {
    const now = new Date();
    const start = new Date(publicite.date_start);

    return now < start;
}

/**
 * Vérifie si une publicité est expirée
 */
function isExpiree(publicite: Publicite): boolean {
    const now = new Date();
    const end = new Date(publicite.date_end);

    return now > end;
}

/**
 * Gère les erreurs API
 */
async function handleApiError(response: Response): Promise<never> {
    let errorMessage = 'Une erreur est survenue';

    try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
        switch (response.status) {
            case 401:
                errorMessage = 'Non authentifié. Veuillez vous reconnecter.';
                break;
            case 403:
                errorMessage = 'Accès refusé. Privilèges administrateur requis.';
                break;
            case 404:
                errorMessage = 'Ressource introuvable.';
                break;
            case 500:
                errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
                break;
        }
    }

    throw new Error(errorMessage);
}

/**
 * Applique les filtres sur une liste de publicités
 */
function applyFilters(publicites: Publicite[], filters: PubliciteFilters): Publicite[] {
    let filtered = [...publicites];

    // Filtre par statut actif/inactif
    if (filters.is_actif !== undefined) {
        filtered = filtered.filter(pub => pub.is_actif === filters.is_actif);
    }

    // Filtre par période en cours
    if (filters.en_cours) {
        filtered = filtered.filter(pub => isEnCours(pub));
    }

    // Filtre par période à venir
    if (filters.a_venir) {
        filtered = filtered.filter(pub => isAVenir(pub));
    }

    // Filtre par période expirée
    if (filters.expirees) {
        filtered = filtered.filter(pub => isExpiree(pub));
    }

    // Filtre par recherche textuelle
    if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        filtered = filtered.filter(pub =>
            pub.titre.toLowerCase().includes(searchLower) ||
            pub.description.toLowerCase().includes(searchLower)
        );
    }

    return filtered;
}

// ============================================
// VALEURS INITIALES
// ============================================

const initialStats: PubliciteStats = {
    total: 0,
    actives: 0,
    inactives: 0,
    en_cours: 0,
    a_venir: 0,
    expirees: 0,
};

const initialFilters: PubliciteFilters = {};

// ============================================
// CRÉATION DU STORE
// ============================================

export const usePublicitesStore = createWithEqualityFn<PublicitesState>((set, get) => ({
    // -------- ÉTAT INITIAL --------
    publicites: [],
    selectedPublicite: null,
    currentFilters: initialFilters,
    isLoading: false,
    error: null,

    stats: initialStats,

    // -------- PROPRIÉTÉS CALCULÉES --------

    /**
     * Retourne les publicités actives
     */
    publicitesActives: () => {
        return get().publicites.filter(pub => pub.is_actif);
    },

    /**
     * Retourne les publicités en cours (période active + statut actif)
     */
    publicitesEnCours: () => {
        return get().publicites.filter(pub => isEnCours(pub));
    },

    /**
     * Retourne les publicités à venir
     */
    publicitesAVenir: () => {
        return get().publicites.filter(pub => isAVenir(pub));
    },

    /**
     * Retourne les publicités expirées
     */
    publicitesExpirees: () => {
        return get().publicites.filter(pub => isExpiree(pub));
    },

    // -------- ACTIONS --------

    /**
     * FETCH PUBLICITES - Récupérer toutes les publicités avec filtres optionnels
     */
    fetchPublicites: async (filters) => {
        set({ isLoading: true, error: null });

        // Sauvegarder les filtres
        if (filters) {
            set({ currentFilters: filters });
        }

        try {
            getAuthToken();

            const response = await apiFetch('/api/annonces/list', {
                method: 'GET',
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();

            // Votre API retourne { publicites: [...] } ou directement un tableau
            let publicites: Publicite[] = Array.isArray(data) ? data : (data.publicites || []);

            // Appliquer les filtres côté client
            const activeFilters = filters || get().currentFilters;
            if (Object.keys(activeFilters).length > 0) {
                publicites = applyFilters(publicites, activeFilters);
            }

            set({
                publicites,
                isLoading: false,
                error: null,
            });

            get().calculateStats();

            console.log(`✅ ${publicites.length} publicité(s) chargée(s)`);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement';

            set({
                error: errorMessage,
                isLoading: false,
                publicites: [],
            });

            console.error('❌ Erreur fetchPublicites:', errorMessage);

            if (errorMessage.includes('authentifié')) {
                useAuthStore.getState().logout();
            }
        }
    },

    /**
     * FETCH PUBLICITE BY ID - Récupérer une publicité spécifique
     */
    fetchPubliciteById: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            getAuthToken();

            const response = await apiFetch(`/api/annonces/${id}`, {
                method: 'GET',
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();

            // Votre API retourne { publicite: {...} }
            const publicite: Publicite = data.publicite || data;

            set({
                selectedPublicite: publicite,
                isLoading: false,
                error: null,
            });

            console.log('✅ Publicité chargée:', publicite.titre);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement';

            set({
                error: errorMessage,
                isLoading: false,
                selectedPublicite: null,
            });
        }
    },

    /**
     * CREATE PUBLICITE - Créer une nouvelle publicité
     */
    createPublicite: async (data: CreatePubliciteInput) => {
        set({ isLoading: true, error: null });

        try {
            // Vérifier le rôle
            checkAdminRole();

            // Valider les dates
            const dateStart = new Date(data.date_start);
            const dateEnd = new Date(data.date_end);

            if (dateEnd <= dateStart) {
                throw new Error('La date de fin doit être postérieure à la date de début');
            }

            // Préparer les données
            const publiciteData = {
                date_start: data.date_start,
                date_end: data.date_end,
                titre: data.titre.trim(),
                url_image: data.url_image.trim(),
                lien: data.lien.trim(),
                description: data.description.trim(),
                is_actif: data.is_actif ?? true,
            };

            console.log('📤 Création de publicité:', publiciteData);

            const response = await apiFetch('/api/annonces/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(publiciteData),
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const responseData = await response.json();

            // Votre API retourne { publicite: {...} }
            const nouvellePublicite: Publicite = responseData.publicite || responseData;

            const nouvellesPublicites = [...get().publicites, nouvellePublicite];
            set({
                publicites: nouvellesPublicites,
                isLoading: false,
                error: null,
            });

            get().calculateStats();

            console.log('✅ Publicité créée:', nouvellePublicite.titre);

            return nouvellePublicite;

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de création';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur createPublicite:', errorMessage);
            throw error;
        }
    },

    /**
     * UPDATE PUBLICITE - Mettre à jour une publicité
     */
    updatePublicite: async (id: string, data: UpdatePubliciteInput) => {
        set({ isLoading: true, error: null });

        try {
            checkAdminRole();

            // Valider les dates si fournies
            if (data.date_start && data.date_end) {
                const dateStart = new Date(data.date_start);
                const dateEnd = new Date(data.date_end);

                if (dateEnd <= dateStart) {
                    throw new Error('La date de fin doit être postérieure à la date de début');
                }
            }

            const updateData = { ...data };

            console.log('📤 Mise à jour de publicité:', updateData);

            const response = await apiFetch(`/api/annonces/update/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const responseData = await response.json();
            const publiciteMiseAJour: Publicite = responseData.publicite || responseData;

            const nouvellesPublicites = get().publicites.map(pub =>
                pub.id === id ? publiciteMiseAJour : pub
            );

            const selectedPublicite = get().selectedPublicite;
            const newSelectedPublicite = selectedPublicite?.id === id
                ? publiciteMiseAJour
                : selectedPublicite;

            set({
                publicites: nouvellesPublicites,
                selectedPublicite: newSelectedPublicite,
                isLoading: false,
                error: null,
            });

            get().calculateStats();

            console.log('✅ Publicité mise à jour:', publiciteMiseAJour.titre);

            return publiciteMiseAJour;

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
     * DELETE PUBLICITE - Supprimer une publicité
     */
    deletePublicite: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            checkAdminRole();

            const response = await apiFetch(`/api/annonces/delete/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const nouvellesPublicites = get().publicites.filter(pub => pub.id !== id);

            const selectedPublicite = get().selectedPublicite;
            const newSelectedPublicite = selectedPublicite?.id === id
                ? null
                : selectedPublicite;

            set({
                publicites: nouvellesPublicites,
                selectedPublicite: newSelectedPublicite,
                isLoading: false,
                error: null,
            });

            get().calculateStats();

            console.log('✅ Publicité supprimée');
            
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
     * TOGGLE PUBLICITE ACTIVE - Activer/désactiver une publicité
     */
    togglePubliciteActive: async (id: string, isActif: boolean) => {
        try {
            await get().updatePublicite(id, { is_actif: isActif });
            console.log(`✅ Publicité ${isActif ? 'activée' : 'désactivée'}`);
        } catch (error) {
            throw error;
        }
    },

    // -------- ACTIONS UTILITAIRES --------

    setSelectedPublicite: (publicite: Publicite | null) => {
        set({ selectedPublicite: publicite });
    },

    setFilters: (filters: PubliciteFilters) => {
        console.log('[setFilters] Nouveaux filtres:', filters);
        set({ currentFilters: filters });
        get().fetchPublicites(filters);
    },

    resetFilters: () => {
        console.log('[resetFilters] Réinitialisation des filtres');
        set({ currentFilters: initialFilters });
        get().fetchPublicites();
    },

    clearError: () => {
        set({ error: null });
    },

    calculateStats: () => {
        const publicites = get().publicites;

        const stats: PubliciteStats = {
            total: publicites.length,
            actives: publicites.filter(pub => pub.is_actif).length,
            inactives: publicites.filter(pub => !pub.is_actif).length,
            en_cours: publicites.filter(pub => isEnCours(pub)).length,
            a_venir: publicites.filter(pub => isAVenir(pub)).length,
            expirees: publicites.filter(pub => isExpiree(pub)).length,
        };

        set({ stats });

        console.log('📊 Statistiques calculées:', stats);
    },

    refresh: async () => {
        await get().fetchPublicites(get().currentFilters);
    },
}));

// ============================================
// SÉLECTEURS UTILITAIRES
// ============================================

/**
 * Sélecteur pour les publicités actives
 */
export const usePublicitesActives = () => {
    return usePublicitesStore((state) => {
        return state.publicites.filter(pub => pub.is_actif);
    }, (a, b) => {
        if (a.length !== b.length) return false;
        return a.every((pub, i) => pub.id === b[i]?.id);
    });
};

/**
 * Sélecteur pour les publicités en cours
 */
export const usePublicitesEnCours = () => {
    return usePublicitesStore((state) => {
        return state.publicites.filter(pub => isEnCours(pub));
    }, (a, b) => {
        if (a.length !== b.length) return false;
        return a.every((pub, i) => pub.id === b[i]?.id);
    });
};

/**
 * Sélecteur pour les publicités à venir
 */
export const usePublicitesAVenir = () => {
    return usePublicitesStore((state) => {
        return state.publicites.filter(pub => isAVenir(pub));
    }, (a, b) => {
        if (a.length !== b.length) return false;
        return a.every((pub, i) => pub.id === b[i]?.id);
    });
};

/**
 * Sélecteur pour les publicités expirées
 */
export const usePublicitesExpirees = () => {
    return usePublicitesStore((state) => {
        return state.publicites.filter(pub => isExpiree(pub));
    }, (a, b) => {
        if (a.length !== b.length) return false;
        return a.every((pub, i) => pub.id === b[i]?.id);
    });
};

/**
 * Sélecteur pour l'état de chargement
 */
export const usePublicitesLoading = () => {
    return usePublicitesStore((state) => state.isLoading);
};

/**
 * Sélecteur pour les erreurs
 */
export const usePublicitesError = () => {
    return usePublicitesStore((state) => state.error);
};

/**
 * Sélecteur pour les statistiques
 */
export const usePublicitesStats = () => {
    return usePublicitesStore((state) => state.stats);
};