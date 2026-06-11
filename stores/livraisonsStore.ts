// stores/livraisonsStore.ts
import { createWithEqualityFn } from 'zustand/traditional';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export type LivraisonStatut =
    | 'En attente'
    | 'En cours de livraison'
    | 'Livrée'
    | 'Annulée'
    | 'Reportée';

export interface LivraisonCommande {
    id: string;
    numero: string;
    statut: string;
    prix: number;
    adresse_livraison: string;
}

export interface LivraisonUser {
    id: string;
    name: string;
    email: string;
    phone: string;
}

export interface Livraison {
    id: string;
    adresse: string;
    details: string;
    statut: string;
    date_livraison: string;
    ville: string;
    phone: string;
    commande_id: string;
    user_id: string | null;
    livreur_id: string | null;
    created_at: string;
    updated_at: string;
    commandes?: LivraisonCommande;
    users?: LivraisonUser;
    livreur?: LivraisonUser | null;
}

export interface LivraisonStats {
    total: number;
    en_attente: number;
    en_cours: number;
    livrees: number;
    annulees: number;
}

export interface CreateLivraisonData {
    commande_id: string;
    adresse: string;
    ville: string;
    phone: string;
    date_livraison: string;
    details?: string;
    livreur_id?: string | null;
}

export interface LivreurOption {
    id: string;
    name: string;
    email: string;
    phone: string;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface LivraisonsState {
    livraisons: Livraison[];
    selectedLivraison: Livraison | null;
    isLoading: boolean;
    error: string | null;
    stats: LivraisonStats;

    fetchLivraisons: () => Promise<void>;
    createLivraison: (data: CreateLivraisonData) => Promise<void>;
    updateStatut: (id: string, statut: LivraisonStatut) => Promise<void>;
    assignLivreur: (id: string, livreur_id: string) => Promise<void>;
    fetchLivreurs: () => Promise<LivreurOption[]>;
    deleteLivraison: (id: string) => Promise<void>;
    setSelectedLivraison: (livraison: Livraison | null) => void;
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
            case 404: errorMessage = 'Livraison introuvable.'; break;
            case 500: errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'; break;
        }
    }
    throw new Error(errorMessage);
}

// ============================================
// NORMALISATION DU STATUT (DB → display)
// ============================================

export function normalizeStatut(statut: string): string {
    const s = statut?.toLowerCase() ?? '';
    if (s.includes('attente')) return 'En attente';
    if (s.includes('attribu')) return 'Attribuée';
    if (s.includes('cours')) return 'En cours de livraison';
    if (s.includes('livr')) return 'Livrée';
    if (s.includes('annul')) return 'Annulée';
    if (s.includes('report')) return 'Reportée';
    return statut;
}

// ============================================
// VALEURS INITIALES
// ============================================

const initialStats: LivraisonStats = {
    total: 0,
    en_attente: 0,
    en_cours: 0,
    livrees: 0,
    annulees: 0,
};

// ============================================
// CRÉATION DU STORE
// ============================================

export const useLivraisonsStore = createWithEqualityFn<LivraisonsState>((set, get) => ({
    livraisons: [],
    selectedLivraison: null,
    isLoading: false,
    error: null,
    stats: initialStats,

    /**
     * FETCH LIVRAISONS - Récupérer toutes les livraisons (admin)
     */
    fetchLivraisons: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = getAuthToken();
            const response = await fetch('/api/livraisons/list', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            const livraisons: Livraison[] = data.livraisons || [];
            set({ livraisons, isLoading: false, error: null });
            get().calculateStats();
            console.log(`✅ ${livraisons.length} livraison(s) chargée(s)`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: errorMessage, isLoading: false, livraisons: [] });
            console.error('❌ Erreur fetchLivraisons:', errorMessage);
            if (
                errorMessage.includes('authentifié') ||
                errorMessage.includes('autorisé') ||
                errorMessage.includes('token')
            ) useAuthStore.getState().logout();
        }
    },

    /**
     * CREATE LIVRAISON - Créer une livraison pour une commande (admin)
     */
    createLivraison: async (data: CreateLivraisonData) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/livraisons/create', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!response.ok) await handleApiError(response);
            const result = await response.json();
            const newLivraison: Livraison = result.livraison;
            const livraisons = [newLivraison, ...get().livraisons];
            set({ livraisons, isLoading: false, error: null });
            get().calculateStats();
            toast.success('Livraison créée', { description: `Livraison vers ${data.ville} créée avec succès` });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de création';
            set({ error: errorMessage, isLoading: false });
            toast.error('Erreur', { description: errorMessage });
            throw error;
        }
    },

    /**
     * UPDATE STATUT - Mettre à jour le statut d'une livraison (admin)
     */
    updateStatut: async (id: string, statut: LivraisonStatut) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/livraisons/${id}/update`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ statut }),
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            const updated: Livraison = data.livraison;
            const livraisons = get().livraisons.map(l => l.id === id ? updated : l);
            const selectedLivraison = get().selectedLivraison?.id === id
                ? updated
                : get().selectedLivraison;
            set({ livraisons, selectedLivraison, isLoading: false, error: null });
            get().calculateStats();
            toast.success('Statut mis à jour', { description: `Livraison → ${statut}` });
            console.log(`✅ Statut mis à jour : ${statut}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de mise à jour';
            set({ error: errorMessage, isLoading: false });
            toast.error('Erreur', { description: errorMessage });
            throw error;
        }
    },

    /**
     * ASSIGN LIVREUR - Attribuer un livreur à une livraison (admin)
     */
    assignLivreur: async (id: string, livreur_id: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/livraisons/${id}/update`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ livreur_id }),
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            const updated: Livraison = data.livraison;
            const livraisons = get().livraisons.map(l => l.id === id ? updated : l);
            const selectedLivraison = get().selectedLivraison?.id === id
                ? updated
                : get().selectedLivraison;
            set({ livraisons, selectedLivraison, isLoading: false, error: null });
            get().calculateStats();
            toast.success('Livreur attribué', { description: 'La livraison est maintenant en cours' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur d\'attribution';
            set({ error: errorMessage, isLoading: false });
            toast.error('Erreur', { description: errorMessage });
            throw error;
        }
    },

    /**
     * FETCH LIVREURS - Récupérer la liste des livreurs disponibles (admin)
     */
    fetchLivreurs: async (): Promise<LivreurOption[]> => {
        try {
            const token = getAuthToken();
            const response = await fetch('/api/users/livreurs', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            return data.livreurs as LivreurOption[];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
            toast.error('Erreur', { description: errorMessage });
            return [];
        }
    },

    /**
     * DELETE LIVRAISON - Supprimer une livraison (admin)
     */
    deleteLivraison: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/livraisons/${id}/delete`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) await handleApiError(response);
            const livraisons = get().livraisons.filter(l => l.id !== id);
            const selectedLivraison = get().selectedLivraison?.id === id
                ? null
                : get().selectedLivraison;
            set({ livraisons, selectedLivraison, isLoading: false, error: null });
            get().calculateStats();
            toast.success('Livraison supprimée');
            console.log('✅ Livraison supprimée');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de suppression';
            set({ error: errorMessage, isLoading: false });
            toast.error('Erreur', { description: errorMessage });
            throw error;
        }
    },

    setSelectedLivraison: (livraison) => set({ selectedLivraison: livraison }),

    calculateStats: () => {
        const livraisons = get().livraisons;
        set({
            stats: {
                total: livraisons.length,
                en_attente: livraisons.filter(l => {
                    const s = l.statut?.toLowerCase() ?? '';
                    return s.includes('attente') || s.includes('attribu');
                }).length,
                en_cours: livraisons.filter(l => {
                    const s = l.statut?.toLowerCase() ?? '';
                    return s.includes('cours');
                }).length,
                livrees: livraisons.filter(l => {
                    const s = l.statut?.toLowerCase() ?? '';
                    return s.includes('livr');
                }).length,
                annulees: livraisons.filter(l => {
                    const s = l.statut?.toLowerCase() ?? '';
                    return s.includes('annul') || s.includes('report');
                }).length,
            }
        });
    },

    clearError: () => set({ error: null }),

    refresh: async () => get().fetchLivraisons(),
}));
