// stores/reclamationsStore.ts
import { createWithEqualityFn } from 'zustand/traditional';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export type ReclamationStatut =
    | 'En attente de traitement'
    | 'En cours'
    | 'Rejetée'
    | 'Remboursée';

export interface ReclamationUser {
    id: string;
    name: string;
    email: string;
    phone: string;
}

export interface ReclamationCommande {
    id: string;
    numero: string;
    statut: string;
    prix: number;
}

export interface Reclamation {
    id: string;
    description: string;
    phone: string;
    statut: ReclamationStatut;
    commande_id: string;
    user_id: string;
    reponse: string | null;
    created_at: string;
    updated_at: string;
    users?: ReclamationUser;
    commandes?: ReclamationCommande;
}

export interface ReclamationStats {
    total: number;
    en_attente: number;
    en_cours: number;
    rejetees: number;
    remboursees: number;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface ReclamationsState {
    reclamations: Reclamation[];
    selectedReclamation: Reclamation | null;
    isLoading: boolean;
    error: string | null;
    stats: ReclamationStats;

    fetchReclamations: () => Promise<void>;
    updateStatut: (id: string, statut: ReclamationStatut) => Promise<void>;
    deleteReclamation: (id: string) => Promise<void>;
    setSelectedReclamation: (reclamation: Reclamation | null) => void;
    calculateStats: () => void;
    clearError: () => void;
    refresh: () => Promise<void>;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function getAuthToken(): string {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Non authentifié. Veuillez vous connecter.');
    return token;
}

function getAuthHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
    };
}

async function handleApiError(response: Response): Promise<never> {
    let errorMessage = 'Une erreur est survenue';
    try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
        switch (response.status) {
            case 401: errorMessage = 'Non authentifié. Veuillez vous reconnecter.'; break;
            case 403: errorMessage = 'Accès refusé. Privilèges administrateur requis.'; break;
            case 404: errorMessage = 'Ressource introuvable.'; break;
            case 500: errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'; break;
        }
    }
    throw new Error(errorMessage);
}

// ============================================
// VALEURS INITIALES
// ============================================

const initialStats: ReclamationStats = {
    total: 0,
    en_attente: 0,
    en_cours: 0,
    rejetees: 0,
    remboursees: 0,
};

// ============================================
// CRÉATION DU STORE
// ============================================

export const useReclamationsStore = createWithEqualityFn<ReclamationsState>((set, get) => ({
    reclamations: [],
    selectedReclamation: null,
    isLoading: false,
    error: null,
    stats: initialStats,

    /**
     * FETCH RECLAMATIONS - Récupérer toutes les réclamations (admin)
     */
    fetchReclamations: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = getAuthToken();
            const response = await fetch('/api/reclamations/admin/list', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            const reclamations: Reclamation[] = data.reclamations || [];
            set({ reclamations, isLoading: false, error: null });
            get().calculateStats();
            console.log(`✅ ${reclamations.length} réclamation(s) chargée(s)`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: errorMessage, isLoading: false, reclamations: [] });
            console.error('❌ Erreur fetchReclamations:', errorMessage);
            if (errorMessage.includes('authentifié')) useAuthStore.getState().logout();
        }
    },

    /**
     * UPDATE STATUT - Mettre à jour le statut d'une réclamation (admin)
     */
    updateStatut: async (id: string, statut: ReclamationStatut) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/reclamations/${id}/update-status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ statut }),
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            const updated: Reclamation = data.reclamation;
            const reclamations = get().reclamations.map(r => r.id === id ? updated : r);
            const selectedReclamation = get().selectedReclamation?.id === id
                ? updated
                : get().selectedReclamation;
            set({ reclamations, selectedReclamation, isLoading: false, error: null });
            get().calculateStats();
            console.log(`✅ Statut mis à jour : ${statut}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de mise à jour';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    /**
     * DELETE RECLAMATION - Supprimer une réclamation (admin)
     */
    deleteReclamation: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/reclamations/${id}/delete`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) await handleApiError(response);
            const reclamations = get().reclamations.filter(r => r.id !== id);
            const selectedReclamation = get().selectedReclamation?.id === id
                ? null
                : get().selectedReclamation;
            set({ reclamations, selectedReclamation, isLoading: false, error: null });
            get().calculateStats();
            console.log('✅ Réclamation supprimée');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de suppression';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    setSelectedReclamation: (reclamation) => set({ selectedReclamation: reclamation }),

    calculateStats: () => {
        const reclamations = get().reclamations;
        set({
            stats: {
                total: reclamations.length,
                en_attente: reclamations.filter(r => r.statut === 'En attente de traitement').length,
                en_cours: reclamations.filter(r => r.statut === 'En cours').length,
                rejetees: reclamations.filter(r => r.statut === 'Rejetée').length,
                remboursees: reclamations.filter(r => r.statut === 'Remboursée').length,
            }
        });
    },

    clearError: () => set({ error: null }),

    refresh: async () => get().fetchReclamations(),
}));
