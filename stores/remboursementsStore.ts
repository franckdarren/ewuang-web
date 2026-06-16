// stores/remboursementsStore.ts
import { createWithEqualityFn } from 'zustand/traditional';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export type RemboursementStatut =
    | 'En attente réponse vendeur'
    | 'En attente arbitrage admin'
    | "En traitement par l'admin"
    | 'Remboursée'
    | 'Rejetée'
    | 'Annulée';

export type DecisionVendeur = 'Acceptée' | 'Refusée' | 'Sans réponse' | null;

export interface RemboursementPartie {
    id: string;
    name: string;
    email?: string;
    phone?: string;
}

export interface RemboursementCommande {
    id: string;
    numero: string;
    statut: string;
    prix: number;
}

export interface Remboursement {
    id: string;
    commande_id: string;
    paiement_id: string | null;
    user_id: string;
    vendeur_id: string | null;
    montant: number;
    motif: string;
    statut: RemboursementStatut;
    decision_vendeur: DecisionVendeur;
    motif_vendeur: string | null;
    traite_par: string | null;
    conclusion_admin: string | null;
    vendeur_deadline: string | null;
    rembourse_le: string | null;
    created_at: string;
    updated_at: string;
    client?: RemboursementPartie;
    vendeur?: RemboursementPartie;
    commandes?: RemboursementCommande;
}

export interface RemboursementStats {
    total: number;
    attente_vendeur: number;
    arbitrage: number;
    en_traitement: number;
    rembourses: number;
    rejetes: number;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface RemboursementsState {
    remboursements: Remboursement[];
    selected: Remboursement | null;
    isLoading: boolean;
    error: string | null;
    stats: RemboursementStats;

    // Admin
    fetchAll: (statut?: RemboursementStatut) => Promise<void>;
    priseEnCharge: (id: string) => Promise<void>;
    conclure: (id: string, decision: 'Valider' | 'Rejeter', conclusion?: string) => Promise<void>;

    // Vendeur
    fetchVendeur: () => Promise<void>;
    decisionVendeur: (id: string, decision: 'Acceptée' | 'Refusée', motif?: string) => Promise<void>;

    // Client
    fetchUser: () => Promise<void>;
    creer: (commande_id: string, motif: string) => Promise<Remboursement | null>;
    annuler: (id: string) => Promise<void>;

    setSelected: (r: Remboursement | null) => void;
    calculateStats: () => void;
    clearError: () => void;
}

// ============================================
// UTILITAIRES
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
            case 403: errorMessage = 'Accès refusé.'; break;
            case 404: errorMessage = 'Ressource introuvable.'; break;
            case 409: errorMessage = 'Action impossible dans l\'état actuel.'; break;
            case 500: errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'; break;
        }
    }
    throw new Error(errorMessage);
}

const initialStats: RemboursementStats = {
    total: 0,
    attente_vendeur: 0,
    arbitrage: 0,
    en_traitement: 0,
    rembourses: 0,
    rejetes: 0,
};

// ============================================
// STORE
// ============================================

export const useRemboursementsStore = createWithEqualityFn<RemboursementsState>((set, get) => ({
    remboursements: [],
    selected: null,
    isLoading: false,
    error: null,
    stats: initialStats,

    fetchAll: async (statut) => {
        set({ isLoading: true, error: null });
        try {
            const url = statut
                ? `/api/remboursements/list?statut=${encodeURIComponent(statut)}`
                : '/api/remboursements/list';
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            set({ remboursements: data.remboursements ?? [], isLoading: false });
            get().calculateStats();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: msg, isLoading: false, remboursements: [] });
            if (msg.includes('authentifié')) useAuthStore.getState().logout();
        }
    },

    fetchVendeur: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/remboursements/vendeur', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            set({ remboursements: data.remboursements ?? [], isLoading: false });
            get().calculateStats();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: msg, isLoading: false, remboursements: [] });
        }
    },

    fetchUser: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/remboursements/user', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            set({ remboursements: data.remboursements ?? [], isLoading: false });
            get().calculateStats();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: msg, isLoading: false, remboursements: [] });
        }
    },

    creer: async (commande_id, motif) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/remboursements/create', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ commande_id, motif }),
            });
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            const created: Remboursement = data.remboursement;
            set({ remboursements: [created, ...get().remboursements], isLoading: false });
            get().calculateStats();
            toast.success('Demande de remboursement envoyée');
            return created;
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Erreur';
            set({ error: msg, isLoading: false });
            toast.error('Erreur', { description: msg });
            return null;
        }
    },

    decisionVendeur: async (id, decision, motif) => {
        await patchAndReplace(set, get, `/api/remboursements/${id}/decision-vendeur`, {
            decision,
            motif_vendeur: motif,
        }, decision === 'Acceptée' ? 'Remboursement accepté' : 'Remboursement refusé');
    },

    priseEnCharge: async (id) => {
        await patchAndReplace(set, get, `/api/remboursements/${id}/prise-en-charge`, {}, 'Demande prise en charge');
    },

    conclure: async (id, decision, conclusion) => {
        await patchAndReplace(set, get, `/api/remboursements/${id}/conclusion`, {
            decision,
            conclusion_admin: conclusion,
        }, decision === 'Valider' ? 'Remboursement validé' : 'Demande rejetée');
    },

    annuler: async (id) => {
        await patchAndReplace(set, get, `/api/remboursements/${id}/annuler`, {}, 'Demande annulée');
    },

    setSelected: (r) => set({ selected: r }),

    calculateStats: () => {
        const rs = get().remboursements;
        set({
            stats: {
                total: rs.length,
                attente_vendeur: rs.filter(r => r.statut === 'En attente réponse vendeur').length,
                arbitrage: rs.filter(r => r.statut === 'En attente arbitrage admin').length,
                en_traitement: rs.filter(r => r.statut === "En traitement par l'admin").length,
                rembourses: rs.filter(r => r.statut === 'Remboursée').length,
                rejetes: rs.filter(r => r.statut === 'Rejetée').length,
            },
        });
    },

    clearError: () => set({ error: null }),
}));

// Helper partagé : PATCH puis remplace l'élément dans la liste + selected.
async function patchAndReplace(
    set: (partial: Partial<RemboursementsState>) => void,
    get: () => RemboursementsState,
    url: string,
    body: Record<string, unknown>,
    successMsg: string,
): Promise<void> {
    set({ isLoading: true, error: null });
    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(body),
        });
        if (!response.ok) await handleApiError(response);
        const data = await response.json();
        const updated: Remboursement = data.remboursement;
        const remboursements = get().remboursements.map(r => r.id === updated.id ? updated : r);
        const selected = get().selected?.id === updated.id ? updated : get().selected;
        set({ remboursements, selected, isLoading: false });
        get().calculateStats();
        toast.success(successMsg);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur';
        set({ error: msg, isLoading: false });
        toast.error('Erreur', { description: msg });
        throw error;
    }
}
