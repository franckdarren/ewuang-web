import { createWithEqualityFn } from 'zustand/traditional';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';
import { apiFetch } from '@/app/lib/apiFetch';

// ============================================
// TYPES
// ============================================

export type PublitePosition = 'banniere_accueil' | 'banniere_categorie' | 'banniere_boutique';
export type PublitePremiumStatut = 'en_attente' | 'approuve' | 'refuse' | 'annule';

export interface PubliciteCategorie {
    id: string;
    nom: string;
    slug: string;
}

export interface PubliciteBoutique {
    id: string;
    name: string;
    email: string;
    url_logo: string | null;
}

export interface PublicitePremium {
    id: string;
    boutique_id: string;
    position: PublitePosition;
    categorie_id: string | null;
    titre: string;
    url_image: string;
    lien: string | null;
    description: string | null;
    date_start: string;
    date_end: string;
    statut: PublitePremiumStatut;
    prix: number | null;
    notes_admin: string | null;
    approuve_par: string | null;
    approuve_le: string | null;
    created_at: string;
    updated_at: string;
    boutique?: PubliciteBoutique;
    categorie?: PubliciteCategorie | null;
}

export interface CreatePublicitePremiumInput {
    position: PublitePosition;
    titre: string;
    url_image: string;
    lien?: string | null;
    description?: string | null;
    date_start: string;
    date_end: string;
    categorie_id?: string | null;
    boutique_id?: string | null;
    prix?: number | null;
}

export interface UpdatePublicitePremiumInput {
    position?: PublitePosition;
    titre?: string;
    url_image?: string;
    lien?: string | null;
    description?: string | null;
    date_start?: string;
    date_end?: string;
    categorie_id?: string | null;
    boutique_id?: string | null;
    prix?: number | null;
}

export interface PublicitePremiumStats {
    total: number;
    en_attente: number;
    approuvees: number;
    refusees: number;
    annulees: number;
    actives_maintenant: number;
}

interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

interface PublitesPremiumState extends LoadingState {
    publicitesPremium: PublicitePremium[];

    stats: PublicitePremiumStats;

    fetchPublitesPremium: (statut?: string) => Promise<void>;
    fetchMesPubs: () => Promise<void>;
    createPublitePremium: (data: CreatePublicitePremiumInput) => Promise<PublicitePremium>;
    updatePublitePremium: (id: string, data: UpdatePublicitePremiumInput) => Promise<PublicitePremium>;
    deletePublitePremium: (id: string) => Promise<void>;
    approuverPublite: (id: string) => Promise<void>;
    refuserPublite: (id: string, notes_admin: string) => Promise<void>;
    annulerPublite: (id: string) => Promise<void>;

    computeStats: () => PublicitePremiumStats;
}

// ============================================
// HELPERS
// ============================================

function getToken(): string | null {
    return useAuthStore.getState().token;
}

function isActifMaintenant(pub: PublicitePremium): boolean {
    const now = new Date();
    return pub.statut === 'approuve' && new Date(pub.date_start) <= now && new Date(pub.date_end) >= now;
}

// ============================================
// STORE
// ============================================

export const usePublitesPremiumStore = createWithEqualityFn<PublitesPremiumState>(
    (set, get) => ({
        publicitesPremium: [],
        isLoading: false,
        error: null,

        stats: {
            total: 0,
            en_attente: 0,
            approuvees: 0,
            refusees: 0,
            annulees: 0,
            actives_maintenant: 0,
        },

        computeStats: () => {
            const list = get().publicitesPremium;
            return {
                total: list.length,
                en_attente: list.filter((p) => p.statut === 'en_attente').length,
                approuvees: list.filter((p) => p.statut === 'approuve').length,
                refusees: list.filter((p) => p.statut === 'refuse').length,
                annulees: list.filter((p) => p.statut === 'annule').length,
                actives_maintenant: list.filter(isActifMaintenant).length,
            };
        },

        fetchPublitesPremium: async (statut?: string) => {
            const token = getToken();
            if (!token) return;

            set({ isLoading: true, error: null });
            try {
                const url = statut
                    ? `/api/campagnes-premium/list?statut=${statut}`
                    : '/api/campagnes-premium/list';

                const res = await apiFetch(url);

                if (!res.ok) throw new Error('Erreur lors du chargement');
                const json = await res.json();
                const list: PublicitePremium[] = json.publicites_premium ?? [];
                set({ publicitesPremium: list });
            } catch (err: unknown) {
                set({ error: err instanceof Error ? err.message : 'Erreur inconnue' });
            } finally {
                set({ isLoading: false });
                set({ stats: get().computeStats() });
            }
        },

        fetchMesPubs: async () => {
            const token = getToken();
            if (!token) return;

            set({ isLoading: true, error: null });
            try {
                const res = await apiFetch('/api/campagnes-premium/mes-pubs');

                if (!res.ok) throw new Error('Erreur lors du chargement');
                const json = await res.json();
                const list: PublicitePremium[] = json.publicites_premium ?? [];
                set({ publicitesPremium: list });
            } catch (err: unknown) {
                set({ error: err instanceof Error ? err.message : 'Erreur inconnue' });
            } finally {
                set({ isLoading: false });
                set({ stats: get().computeStats() });
            }
        },

        createPublitePremium: async (data: CreatePublicitePremiumInput) => {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');

            set({ isLoading: true, error: null });
            try {
                const res = await apiFetch('/api/campagnes-premium/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!res.ok) {
                    const err = await res.json();
                    if (res.status === 409 && err.conflict) {
                        const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                        toast.error('Emplacement déjà occupé', {
                            description: `« ${err.conflict.titre} » du ${fmt(err.conflict.date_start)} au ${fmt(err.conflict.date_end)}`,
                        });
                    }
                    throw new Error(err.error ?? 'Erreur lors de la création');
                }

                const json = await res.json();
                const created: PublicitePremium = json.publicite_premium;
                set((state) => ({
                    publicitesPremium: [created, ...state.publicitesPremium],
                }));
                set({ stats: get().computeStats() });
                toast.success('Campagne créée', { description: created.titre });
                return created;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
                if (!msg.includes('déjà occupé')) {
                    toast.error('Erreur de création', { description: msg });
                }
                throw err;
            } finally {
                set({ isLoading: false });
            }
        },

        updatePublitePremium: async (id: string, data: UpdatePublicitePremiumInput) => {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');

            set({ isLoading: true, error: null });
            try {
                const res = await apiFetch(`/api/campagnes-premium/${id}/update`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error ?? 'Erreur lors de la modification');
                }

                const json = await res.json();
                const updated: PublicitePremium = json.publicite_premium;
                set((state) => ({
                    publicitesPremium: state.publicitesPremium.map((p) =>
                        p.id === id ? { ...p, ...updated } : p
                    ),
                }));
                set({ stats: get().computeStats() });
                toast.success('Publicité mise à jour', { description: updated.titre });
                return updated;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erreur lors de la modification';
                toast.error('Erreur de modification', { description: msg });
                throw err;
            } finally {
                set({ isLoading: false });
            }
        },

        deletePublitePremium: async (id: string) => {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');

            set({ isLoading: true, error: null });
            try {
                const res = await apiFetch(`/api/campagnes-premium/${id}/delete`, {
                    method: 'DELETE',
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error ?? 'Erreur lors de la suppression');
                }

                set((state) => ({
                    publicitesPremium: state.publicitesPremium.filter((p) => p.id !== id),
                }));
                set({ stats: get().computeStats() });
                toast.success('Publicité supprimée');
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erreur lors de la suppression';
                toast.error('Erreur de suppression', { description: msg });
                throw err;
            } finally {
                set({ isLoading: false });
            }
        },

        approuverPublite: async (id: string) => {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');

            const res = await apiFetch(`/api/campagnes-premium/${id}/approuver`, {
                method: 'PATCH',
            });

            if (!res.ok) {
                const err = await res.json();
                if (res.status === 409 && err.conflict) {
                    const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                    toast.error('Conflit d\'emplacement', {
                        description: `« ${err.conflict.titre} » occupe déjà cet emplacement du ${fmt(err.conflict.date_start)} au ${fmt(err.conflict.date_end)}`,
                    });
                } else {
                    toast.error('Erreur', { description: err.error ?? 'Erreur lors de l\'approbation' });
                }
                throw new Error(err.error ?? 'Erreur lors de l\'approbation');
            }

            const json = await res.json();
            const updated: PublicitePremium = json.publicite_premium;
            set((state) => ({
                publicitesPremium: state.publicitesPremium.map((p) =>
                    p.id === id ? { ...p, ...updated } : p
                ),
            }));
            set({ stats: get().computeStats() });
            toast.success('Campagne approuvée');
        },

        refuserPublite: async (id: string, notes_admin: string) => {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');

            const res = await apiFetch(`/api/campagnes-premium/${id}/refuser`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes_admin }),
            });

            if (!res.ok) {
                const err = await res.json();
                const msg = err.error ?? 'Erreur lors du refus';
                toast.error('Erreur', { description: msg });
                throw new Error(msg);
            }

            const json = await res.json();
            const updated: PublicitePremium = json.publicite_premium;
            set((state) => ({
                publicitesPremium: state.publicitesPremium.map((p) =>
                    p.id === id ? { ...p, ...updated } : p
                ),
            }));
            set({ stats: get().computeStats() });
            toast.success('Campagne refusée');
        },

        annulerPublite: async (id: string) => {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');

            const res = await apiFetch(`/api/campagnes-premium/${id}/annuler`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const err = await res.json();
                const msg = err.error ?? 'Erreur lors de l\'annulation';
                toast.error('Erreur', { description: msg });
                throw new Error(msg);
            }

            set((state) => ({
                publicitesPremium: state.publicitesPremium.map((p) =>
                    p.id === id ? { ...p, statut: 'annule' as const } : p
                ),
            }));
            set({ stats: get().computeStats() });
            toast.success('Campagne annulée');
        },
    }),
    Object.is
);
