// stores/zonesLivraisonStore.ts
/**
 * ZonesLivraisonStore - Grille tarifaire des zones de livraison.
 *
 * Lecture (list) : publique.
 * Mutations (create/update/delete) : Administrateur uniquement.
 */

import { createWithEqualityFn } from 'zustand/traditional';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export interface ZoneLivraison {
    id: string;
    ville: string;
    tarif: number;
    is_active: boolean;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateZoneInput {
    ville: string;
    tarif: number;
    is_active?: boolean;
    is_default?: boolean;
}

export interface UpdateZoneInput {
    ville?: string;
    tarif?: number;
    is_active?: boolean;
    is_default?: boolean;
}

interface ZonesLivraisonState {
    zones: ZoneLivraison[];
    isLoading: boolean;
    error: string | null;

    fetchZones: (includeInactive?: boolean) => Promise<void>;
    createZone: (data: CreateZoneInput) => Promise<ZoneLivraison>;
    updateZone: (id: string, data: UpdateZoneInput) => Promise<ZoneLivraison>;
    deleteZone: (id: string) => Promise<void>;
    toggleActive: (id: string, isActive: boolean) => Promise<void>;
    clearError: () => void;
}

// ============================================
// HELPERS
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

function checkAdminRole(): void {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('Non authentifié.');
    if (user.role !== 'Administrateur') {
        throw new Error('Accès refusé. Privilèges administrateur requis.');
    }
}

async function handleApiError(response: Response): Promise<never> {
    let message = 'Une erreur est survenue';
    try {
        const data = await response.json();
        message = data.error || data.message || message;
    } catch {
        if (response.status === 401) message = 'Non authentifié.';
        else if (response.status === 403) message = 'Accès refusé.';
        else if (response.status === 404) message = 'Zone introuvable.';
    }
    throw new Error(message);
}

// ============================================
// STORE
// ============================================

export const useZonesLivraisonStore = createWithEqualityFn<ZonesLivraisonState>((set, get) => ({
    zones: [],
    isLoading: false,
    error: null,

    fetchZones: async (includeInactive = false) => {
        set({ isLoading: true, error: null });
        try {
            const url = `/api/zones-livraison/list${includeInactive ? '?active_only=false' : ''}`;
            const headers: HeadersInit = {};
            const token = useAuthStore.getState().token;
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(url, { method: 'GET', headers });
            if (!res.ok) await handleApiError(res);
            const data = await res.json();
            set({ zones: data.zones || [], isLoading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur de chargement';
            set({ error: message, isLoading: false });
        }
    },

    createZone: async (data) => {
        set({ isLoading: true, error: null });
        try {
            checkAdminRole();
            const res = await fetch('/api/zones-livraison/create', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) await handleApiError(res);
            const { zone } = await res.json();
            set({ zones: [...get().zones, zone], isLoading: false });
            toast.success('Zone créée', { description: `${zone.ville} — ${zone.tarif} FCFA` });
            return zone;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur de création';
            set({ error: message, isLoading: false });
            toast.error('Erreur de création', { description: message });
            throw err;
        }
    },

    updateZone: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            checkAdminRole();
            const res = await fetch(`/api/zones-livraison/update/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) await handleApiError(res);
            const { zone } = await res.json();
            set({
                zones: get().zones.map(z => (z.id === id ? zone : (zone.is_default ? { ...z, is_default: false } : z))),
                isLoading: false,
            });
            toast.success('Zone mise à jour');
            return zone;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur de mise à jour';
            set({ error: message, isLoading: false });
            toast.error('Erreur de mise à jour', { description: message });
            throw err;
        }
    },

    deleteZone: async (id) => {
        set({ isLoading: true, error: null });
        try {
            checkAdminRole();
            const res = await fetch(`/api/zones-livraison/delete/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!res.ok) await handleApiError(res);
            set({ zones: get().zones.filter(z => z.id !== id), isLoading: false });
            toast.success('Zone supprimée');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur de suppression';
            set({ error: message, isLoading: false });
            toast.error('Erreur de suppression', { description: message });
            throw err;
        }
    },

    toggleActive: async (id, isActive) => {
        await get().updateZone(id, { is_active: isActive });
    },

    clearError: () => set({ error: null }),
}));
