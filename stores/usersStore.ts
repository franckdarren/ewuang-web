// stores/usersStore.ts
import { create } from 'zustand';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export interface User {
    id: string;
    auth_id: string | null;
    name: string;
    role: 'Client' | 'Boutique' | 'Livreur' | 'Administrateur';
    email: string;
    url_logo: string | null;
    phone: string | null;
    heure_ouverture: string | null;
    heure_fermeture: string | null;
    description: string | null;
    address: string | null;
    solde: number;
    is_verified: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface UserStats {
    total: number;
    boutiques: number;
    clients: number;
    livreurs: number;
    admins: number;
    verified: number;
    active: number;
}

interface UsersStore {
    users: User[];
    stats: UserStats;
    isLoading: boolean;
    error: string | null;

    fetchUsers: () => Promise<void>;
    deleteUser: (id: string) => Promise<boolean>;
    reset: () => void;
    updateUser: (data: Partial<User>) => Promise<User>;
}

// ============================================
// HELPERS
// ============================================

function computeStats(users: User[]): UserStats {
    // console.log('[computeStats] Calcul des stats depuis users:', users.length);

    return {
        total: users.length,
        boutiques: users.filter(u => u.role === 'Boutique').length,
        clients: users.filter(u => u.role === 'Client').length,
        livreurs: users.filter(u => u.role === 'Livreur').length,
        admins: users.filter(u => u.role === 'Administrateur').length,
        verified: users.filter(u => u.is_verified).length,
        active: users.filter(u => u.is_active).length,
    };
}

// ============================================
// STORE
// ============================================

export const useUsersStore = create<UsersStore>((set, get) => ({
    users: [],
    stats: {
        total: 0,
        boutiques: 0,
        clients: 0,
        livreurs: 0,
        admins: 0,
        verified: 0,
        active: 0,
    },
    isLoading: false,
    error: null,

    // ========================================
    // FETCH USERS
    // ========================================
    fetchUsers: async () => {
        // console.log('[fetchUsers] Début récupération utilisateurs');

        set({ isLoading: true, error: null });

        try {
            const token = useAuthStore.getState().token;

            const res = await fetch('/api/users/list', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            // console.log('✅ [fetchUsers] Données reçues:', data);

            if (!Array.isArray(data)) {
                console.error('[fetchUsers] Format invalide:', data);
                throw new Error('Format de réponse invalide');
            }

            const stats = computeStats(data);

            set({
                users: data,
                stats,
                isLoading: false,
            });

            // console.log('[fetchUsers] Store mis à jour', {
            //     usersCount: data.length,
            //     stats,
            // });

        } catch (err) {
            console.error('[fetchUsers] Erreur:', err);

            const message =
                err instanceof Error ? err.message : 'Erreur inconnue';

            set({
                isLoading: false,
                error: message,
                users: [],
            });

            toast.error('Erreur chargement utilisateurs', {
                description: message,
            });
        }
    },

    // ========================================
    // DELETE USER
    // ========================================
    deleteUser: async (id) => {
        // console.log('[deleteUser] Suppression:', id);

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Suppression échouée');
            }

            const remainingUsers = get().users.filter(u => u.id !== id);
            const stats = computeStats(remainingUsers);

            set({
                users: remainingUsers,
                stats,
            });

            toast.success('Utilisateur supprimé');

            return true;

        } catch (err) {
            console.error('[deleteUser] Erreur:', err);
            toast.error('Erreur suppression utilisateur');
            return false;
        }
    },

    // ========================================
    // RESET
    // ========================================
    reset: () => {
        // console.log('[usersStore] Reset');
        set({
            users: [],
            stats: {
                total: 0,
                boutiques: 0,
                clients: 0,
                livreurs: 0,
                admins: 0,
                verified: 0,
                active: 0,
            },
            isLoading: false,
            error: null,
        });
    },

    // ============================================
    // UPDATE USER
    // ============================================
    updateUser: async (data: Partial<User>) => {
        // console.log('[updateUser] Mise à jour utilisateur', data);

        set({ isLoading: true, error: null });

        try {
            const token = useAuthStore.getState().token;

            const res = await fetch('/api/users/update', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Erreur mise à jour: ${res.status} - ${text}`);
            }

            const json = await res.json();

            if (!json.user) {
                throw new Error('Réponse invalide du serveur');
            }

            // Mettre à jour le store : remplacer l’utilisateur mis à jour
            const updatedUser: User = json.user;
            const users = get().users.map(u =>
                u.id === updatedUser.id ? updatedUser : u
            );

            const stats = computeStats(users);

            set({ users, stats, isLoading: false });

            toast.success('Utilisateur mis à jour');

            return updatedUser;

        } catch (err) {
            console.error('[updateUser] Erreur:', err);
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            set({ isLoading: false, error: message });
            toast.error('Erreur mise à jour utilisateur', { description: message });
            throw err;
        }
    },


}));
