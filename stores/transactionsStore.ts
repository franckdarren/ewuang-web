// stores/transactionsStore.ts
import { createWithEqualityFn } from 'zustand/traditional';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export type PaiementStatut = 'en_attente' | 'valide' | 'echoue' | 'rembourse';
export type PaiementMethode = 'carte' | 'mobile_money' | 'especes';

export interface TransactionUser {
    id: string;
    name: string;
    email: string;
    phone: string | null;
}

export interface TransactionCommande {
    id: string;
    statut: string;
    prix: number;
}

export interface Transaction {
    id: string;
    user_id: string;
    montant: number;
    methode: string;
    statut: PaiementStatut;
    reference: string;
    transaction_id: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    users: TransactionUser | null;
    commandes: TransactionCommande[];
}

export interface TransactionStats {
    total: number;
    montant_total: number;
    valides: number;
    montant_valide: number;
    en_attente: number;
    echouees: number;
    remboursees: number;
}

export interface TransactionFilters {
    statut?: PaiementStatut;
    methode?: PaiementMethode;
    search?: string;
}

interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface TransactionsState extends LoadingState {
    transactions: Transaction[];
    stats: TransactionStats;
    currentFilters: TransactionFilters;

    fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
    setFilters: (filters: TransactionFilters) => void;
    resetFilters: () => void;
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

function applyClientFilters(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
    let filtered = [...transactions];

    if (filters.statut) {
        filtered = filtered.filter(t => t.statut === filters.statut);
    }

    if (filters.methode) {
        filtered = filtered.filter(t => t.methode === filters.methode);
    }

    if (filters.search?.trim()) {
        const search = filters.search.toLowerCase().trim();
        filtered = filtered.filter(t =>
            t.reference.toLowerCase().includes(search) ||
            t.transaction_id?.toLowerCase().includes(search) ||
            t.users?.name.toLowerCase().includes(search) ||
            t.users?.email.toLowerCase().includes(search)
        );
    }

    return filtered;
}

// ============================================
// VALEURS INITIALES
// ============================================

const initialStats: TransactionStats = {
    total: 0,
    montant_total: 0,
    valides: 0,
    montant_valide: 0,
    en_attente: 0,
    echouees: 0,
    remboursees: 0,
};

// ============================================
// CRÉATION DU STORE
// ============================================

export const useTransactionsStore = createWithEqualityFn<TransactionsState>((set, get) => ({
    transactions: [],
    stats: initialStats,
    currentFilters: {},
    isLoading: false,
    error: null,

    fetchTransactions: async (filters) => {
        set({ isLoading: true, error: null });

        if (filters) {
            set({ currentFilters: filters });
        }

        try {
            const token = getAuthToken();

            const params = new URLSearchParams({ limit: '200' });
            const activeFilters = filters || get().currentFilters;

            if (activeFilters.statut) params.set('statut', activeFilters.statut);
            if (activeFilters.methode) params.set('methode', activeFilters.methode);

            const response = await fetch(`/api/paiements/list?${params.toString()}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();
            let transactions: Transaction[] = data.paiements || [];

            // Filtre côté client (search textuel)
            if (activeFilters.search) {
                transactions = applyClientFilters(transactions, { search: activeFilters.search });
            }

            set({ transactions, isLoading: false, error: null });
            get().calculateStats();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: errorMessage, isLoading: false, transactions: [] });

            if (errorMessage.includes('authentifié')) {
                useAuthStore.getState().logout();
            }
        }
    },

    calculateStats: () => {
        const transactions = get().transactions;

        const stats: TransactionStats = {
            total: transactions.length,
            montant_total: transactions.reduce((sum, t) => sum + t.montant, 0),
            valides: transactions.filter(t => t.statut === 'valide').length,
            montant_valide: transactions
                .filter(t => t.statut === 'valide')
                .reduce((sum, t) => sum + t.montant, 0),
            en_attente: transactions.filter(t => t.statut === 'en_attente').length,
            echouees: transactions.filter(t => t.statut === 'echoue').length,
            remboursees: transactions.filter(t => t.statut === 'rembourse').length,
        };

        set({ stats });
    },

    setFilters: (filters) => {
        set({ currentFilters: filters });
        get().fetchTransactions(filters);
    },

    resetFilters: () => {
        set({ currentFilters: {} });
        get().fetchTransactions({});
    },

    clearError: () => set({ error: null }),

    refresh: async () => {
        await get().fetchTransactions(get().currentFilters);
    },
}));
