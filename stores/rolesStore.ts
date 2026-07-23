// stores/rolesStore.ts
/**
 * Store RBAC admin — rôles, catalogue de permissions et affectation des admins.
 * Consomme les routes /api/admin/* via apiFetch (Bearer + retry 401).
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import { apiFetch } from '@/app/lib/apiFetch';

// ============================================
// TYPES
// ============================================

export interface Permission {
    cle: string;       // ex: 'articles.write'
    module: string;    // ex: 'articles'
    action: string;    // read | write | delete | manage
    libelle: string;   // libellé FR
}

export interface AdminRole {
    id: string;
    nom: string;
    description: string | null;
    is_system: boolean;
    created_at: string;
    updated_at: string;
    permissions: string[];       // clés accordées
    permissions_count: number;
    users_count: number;
}

export interface AdminAccount {
    id: string;
    name: string;
    email: string;
    url_logo: string | null;
    admin_role_id: string | null;
}

export interface RolePayload {
    nom: string;
    description?: string | null;
    permissions: string[];
}

export interface CreateAdminPayload {
    name: string;
    email: string;
    password: string;
    admin_role_id: string | null;
}

interface RolesStore {
    roles: AdminRole[];
    permissions: Permission[];   // catalogue
    admins: AdminAccount[];
    isLoading: boolean;
    error: string | null;

    fetchAll: () => Promise<void>;
    fetchRoles: () => Promise<void>;
    createRole: (payload: RolePayload) => Promise<boolean>;
    updateRole: (id: string, payload: Partial<RolePayload>) => Promise<boolean>;
    deleteRole: (id: string) => Promise<boolean>;
    assignRole: (userId: string, adminRoleId: string | null) => Promise<boolean>;
    createAdmin: (payload: CreateAdminPayload) => Promise<boolean>;
    reset: () => void;
}

// ============================================
// HELPERS
// ============================================

async function readError(res: Response): Promise<string> {
    try {
        const data = await res.json();
        return (
            data.error ||
            data.errors?.map((e: { message: string }) => e.message).join(', ') ||
            `Erreur HTTP ${res.status}`
        );
    } catch {
        return `Erreur HTTP ${res.status}`;
    }
}

// ============================================
// STORE
// ============================================

export const useRolesStore = create<RolesStore>((set, get) => ({
    roles: [],
    permissions: [],
    admins: [],
    isLoading: false,
    error: null,

    fetchAll: async () => {
        set({ isLoading: true, error: null });
        try {
            const [rolesRes, permsRes, adminsRes] = await Promise.all([
                apiFetch('/api/admin/roles'),
                apiFetch('/api/admin/permissions'),
                apiFetch('/api/admin/admins'),
            ]);

            if (!rolesRes.ok) throw new Error(await readError(rolesRes));
            if (!permsRes.ok) throw new Error(await readError(permsRes));
            if (!adminsRes.ok) throw new Error(await readError(adminsRes));

            const { roles } = await rolesRes.json();
            const { permissions } = await permsRes.json();
            const { admins } = await adminsRes.json();

            set({ roles, permissions, admins, isLoading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            set({ isLoading: false, error: message });
            toast.error('Erreur de chargement', { description: message });
        }
    },

    fetchRoles: async () => {
        try {
            const res = await apiFetch('/api/admin/roles');
            if (!res.ok) throw new Error(await readError(res));
            const { roles } = await res.json();
            set({ roles });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error('Erreur de chargement des rôles', { description: message });
        }
    },

    createRole: async (payload) => {
        try {
            const res = await apiFetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                toast.error('Création impossible', { description: await readError(res) });
                return false;
            }
            await get().fetchRoles();
            toast.success('Rôle créé');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error('Création impossible', { description: message });
            return false;
        }
    },

    updateRole: async (id, payload) => {
        try {
            const res = await apiFetch(`/api/admin/roles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                toast.error('Mise à jour impossible', { description: await readError(res) });
                return false;
            }
            await get().fetchRoles();
            toast.success('Rôle mis à jour');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error('Mise à jour impossible', { description: message });
            return false;
        }
    },

    deleteRole: async (id) => {
        try {
            const res = await apiFetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                toast.error('Suppression impossible', { description: await readError(res) });
                return false;
            }
            set({ roles: get().roles.filter((r) => r.id !== id) });
            // Les admins rattachés retombent à « aucun rôle »
            set({
                admins: get().admins.map((a) =>
                    a.admin_role_id === id ? { ...a, admin_role_id: null } : a
                ),
            });
            toast.success('Rôle supprimé');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error('Suppression impossible', { description: message });
            return false;
        }
    },

    assignRole: async (userId, adminRoleId) => {
        try {
            const res = await apiFetch(`/api/admin/users/${userId}/admin-role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_role_id: adminRoleId }),
            });
            if (!res.ok) {
                toast.error('Affectation impossible', { description: await readError(res) });
                return false;
            }
            set({
                admins: get().admins.map((a) =>
                    a.id === userId ? { ...a, admin_role_id: adminRoleId } : a
                ),
            });
            // Met à jour les compteurs d'admins par rôle
            await get().fetchRoles();
            toast.success('Rôle affecté');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error('Affectation impossible', { description: message });
            return false;
        }
    },

    createAdmin: async (payload) => {
        try {
            const res = await apiFetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: payload.name,
                    email: payload.email,
                    password: payload.password,
                    role: 'Administrateur',
                    admin_role_id: payload.admin_role_id,
                }),
            });
            if (!res.ok) {
                toast.error('Création impossible', { description: await readError(res) });
                return false;
            }
            // Recharge admins + compteurs de rôles
            await get().fetchAll();
            toast.success('Administrateur créé');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            toast.error('Création impossible', { description: message });
            return false;
        }
    },

    reset: () => set({ roles: [], permissions: [], admins: [], isLoading: false, error: null }),
}));
