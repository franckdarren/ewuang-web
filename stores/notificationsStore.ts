// stores/notificationsStore.ts
import { createWithEqualityFn } from 'zustand/traditional';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

export type NotificationType =
    | 'commande'
    | 'livraison'
    | 'message'
    | 'promotion'
    | 'alerte_stock'
    | 'avis'
    | 'systeme';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    titre: string;
    message: string;
    lien?: string | null;
    is_read: boolean;
    created_at: string;
}

export interface SendNotificationInput {
    user_ids: string[];
    type: NotificationType;
    titre: string;
    message: string;
    lien?: string;
}

export interface NotificationStats {
    total: number;
    non_lues: number;
    lues: number;
    par_type: Record<NotificationType, number>;
}

interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface NotificationsState extends LoadingState {
    notifications: Notification[];
    stats: NotificationStats;
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };

    // Actions
    fetchNotifications: (filters?: { type?: NotificationType; is_read?: boolean; page?: number }) => Promise<void>;
    sendNotification: (data: SendNotificationInput) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
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

const NOTIFICATION_TYPES: NotificationType[] = [
    'commande', 'livraison', 'message', 'promotion', 'alerte_stock', 'avis', 'systeme'
];

const initialStats: NotificationStats = {
    total: 0,
    non_lues: 0,
    lues: 0,
    par_type: {
        commande: 0, livraison: 0, message: 0,
        promotion: 0, alerte_stock: 0, avis: 0, systeme: 0,
    },
};

// ============================================
// CRÉATION DU STORE
// ============================================

export const useNotificationsStore = createWithEqualityFn<NotificationsState>((set, get) => ({
    notifications: [],
    stats: initialStats,
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 50, total: 0, total_pages: 0 },

    fetchNotifications: async (filters) => {
        set({ isLoading: true, error: null });
        try {
            const token = getAuthToken();
            const params = new URLSearchParams();
            params.set('limit', '50');
            if (filters?.page) params.set('page', String(filters.page));
            if (filters?.type) params.set('type', filters.type);
            if (filters?.is_read !== undefined) params.set('is_read', String(filters.is_read));

            const response = await fetch(`/api/notifications/list?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) await handleApiError(response);

            const data = await response.json();
            const notifications: Notification[] = data.notifications || [];

            set({
                notifications,
                pagination: data.pagination || get().pagination,
                isLoading: false,
                error: null,
            });

            get().calculateStats();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
            set({ error: errorMessage, isLoading: false });
            if (errorMessage.includes('authentifié')) {
                useAuthStore.getState().logout();
            }
        }
    },

    sendNotification: async (data: SendNotificationInput) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });

            if (!response.ok) await handleApiError(response);

            set({ isLoading: false, error: null });
            await get().fetchNotifications();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur envoi';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    markAsRead: async (id: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`/api/notifications/mark-read/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) await handleApiError(response);

            set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, is_read: true } : n
                ),
            }));
            get().calculateStats();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur';
            set({ error: errorMessage });
            throw error;
        }
    },

    markAllAsRead: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = getAuthToken();
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) await handleApiError(response);

            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, is_read: true })),
                isLoading: false,
                error: null,
            }));
            get().calculateStats();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    deleteNotification: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const token = getAuthToken();
            const response = await fetch(`/api/notifications/delete/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) await handleApiError(response);

            set(state => ({
                notifications: state.notifications.filter(n => n.id !== id),
                isLoading: false,
                error: null,
            }));
            get().calculateStats();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur de suppression';
            set({ error: errorMessage, isLoading: false });
            throw error;
        }
    },

    calculateStats: () => {
        const notifications = get().notifications;
        const par_type = NOTIFICATION_TYPES.reduce((acc, type) => {
            acc[type] = notifications.filter(n => n.type === type).length;
            return acc;
        }, {} as Record<NotificationType, number>);

        set({
            stats: {
                total: notifications.length,
                non_lues: notifications.filter(n => !n.is_read).length,
                lues: notifications.filter(n => n.is_read).length,
                par_type,
            },
        });
    },

    clearError: () => set({ error: null }),

    refresh: async () => get().fetchNotifications(),
}));
