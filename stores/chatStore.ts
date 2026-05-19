// stores/chatStore.ts
import { createWithEqualityFn } from "zustand/traditional";
import { useAuthStore } from "./authStore";

// ============================================
// TYPES
// ============================================

export interface ChatInterlocuteur {
    id: string;
    name: string;
    url_logo: string | null;
    role: string;
}

export interface ChatThread {
    id: string;
    type: string;
    participant_a_id: string;
    participant_b_id: string;
    commande_id: string | null;
    reclamation_id: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count_a: number;
    unread_count_b: number;
    created_at: string;
    updated_at: string;
    interlocuteur: ChatInterlocuteur | null;
    unread: number;
}

export interface ChatMessage {
    id: string;
    thread_id: string;
    sender_id: string;
    contenu: string | null;
    image_url: string | null; // URL signée (lecture) ou null
    is_read: boolean;
    created_at: string;
}

interface OpenThreadInput {
    target_user_id: string;
    commande_id?: string;
    reclamation_id?: string;
}

interface ChatState {
    threads: ChatThread[];
    messagesByThread: Record<string, ChatMessage[]>;
    activeThreadId: string | null;
    unreadTotal: number;
    isLoadingThreads: boolean;
    isLoadingMessages: boolean;
    isSending: boolean;
    error: string | null;

    fetchThreads: () => Promise<void>;
    fetchUnread: () => Promise<void>;
    openThread: (input: OpenThreadInput) => Promise<string>;
    selectThread: (threadId: string) => Promise<void>;
    fetchMessages: (threadId: string) => Promise<void>;
    sendMessage: (
        threadId: string,
        payload: { contenu?: string; image?: File | null }
    ) => Promise<void>;
    markRead: (threadId: string) => Promise<void>;
    // Mutations temps réel (appelées par l'abonnement Realtime)
    receiveMessage: (message: ChatMessage) => void;
    applyThreadChange: (thread: Partial<ChatThread> & { id: string }) => void;
    clearError: () => void;
}

// ============================================
// HELPERS
// ============================================

function getAuthToken(): string {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error("Non authentifié. Veuillez vous reconnecter.");
    return token;
}

async function readError(response: Response): Promise<string> {
    try {
        const data = await response.json();
        return data.error || data.message || "Une erreur est survenue";
    } catch {
        return `Erreur ${response.status}`;
    }
}

function currentUserId(): string | undefined {
    return useAuthStore.getState().user?.id;
}

function recomputeUnreadTotal(threads: ChatThread[]): number {
    return threads.reduce((sum, t) => sum + (t.unread || 0), 0);
}

// ============================================
// STORE
// ============================================

export const useChatStore = createWithEqualityFn<ChatState>((set, get) => ({
    threads: [],
    messagesByThread: {},
    activeThreadId: null,
    unreadTotal: 0,
    isLoadingThreads: false,
    isLoadingMessages: false,
    isSending: false,
    error: null,

    fetchThreads: async () => {
        set({ isLoadingThreads: true, error: null });
        try {
            const res = await fetch("/api/chat/threads", {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (!res.ok) throw new Error(await readError(res));
            const { threads } = await res.json();
            set({
                threads,
                unreadTotal: recomputeUnreadTotal(threads),
                isLoadingThreads: false,
            });
        } catch (e) {
            set({
                error: e instanceof Error ? e.message : "Erreur de chargement",
                isLoadingThreads: false,
            });
        }
    },

    fetchUnread: async () => {
        try {
            const res = await fetch("/api/chat/unread", {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (!res.ok) return;
            const { total } = await res.json();
            set({ unreadTotal: total });
        } catch {
            /* silencieux : badge non bloquant */
        }
    },

    openThread: async (input) => {
        set({ error: null });
        const res = await fetch("/api/chat/threads", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify(input),
        });
        if (!res.ok) {
            const msg = await readError(res);
            set({ error: msg });
            throw new Error(msg);
        }
        const { thread } = await res.json();
        // Ajoute le fil s'il n'est pas déjà présent
        const exists = get().threads.some((t) => t.id === thread.id);
        if (!exists) {
            await get().fetchThreads();
        }
        return thread.id as string;
    },

    selectThread: async (threadId) => {
        set({ activeThreadId: threadId });
        await get().fetchMessages(threadId);
        await get().markRead(threadId);
    },

    fetchMessages: async (threadId) => {
        set({ isLoadingMessages: true, error: null });
        try {
            const res = await fetch(
                `/api/chat/threads/${threadId}/messages?limit=100`,
                { headers: { Authorization: `Bearer ${getAuthToken()}` } }
            );
            if (!res.ok) throw new Error(await readError(res));
            const { messages } = await res.json();
            set((s) => ({
                messagesByThread: { ...s.messagesByThread, [threadId]: messages },
                isLoadingMessages: false,
            }));
        } catch (e) {
            set({
                error: e instanceof Error ? e.message : "Erreur de chargement",
                isLoadingMessages: false,
            });
        }
    },

    sendMessage: async (threadId, payload) => {
        set({ isSending: true, error: null });
        try {
            const form = new FormData();
            if (payload.contenu) form.append("contenu", payload.contenu);
            if (payload.image) form.append("image", payload.image);

            const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getAuthToken()}` },
                body: form,
            });
            if (!res.ok) throw new Error(await readError(res));
            const { message } = await res.json();

            set((s) => {
                const existing = s.messagesByThread[threadId] ?? [];
                // Évite le doublon si Realtime a déjà livré le message
                const already = existing.some((m) => m.id === message.id);
                return {
                    isSending: false,
                    messagesByThread: {
                        ...s.messagesByThread,
                        [threadId]: already ? existing : [...existing, message],
                    },
                };
            });
        } catch (e) {
            set({
                error: e instanceof Error ? e.message : "Échec de l'envoi",
                isSending: false,
            });
            throw e;
        }
    },

    markRead: async (threadId) => {
        try {
            await fetch(`/api/chat/threads/${threadId}/read`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            set((s) => {
                const threads = s.threads.map((t) =>
                    t.id === threadId ? { ...t, unread: 0 } : t
                );
                return { threads, unreadTotal: recomputeUnreadTotal(threads) };
            });
        } catch {
            /* non bloquant */
        }
    },

    receiveMessage: (message) => {
        set((s) => {
            const threadId = message.thread_id;
            const existing = s.messagesByThread[threadId] ?? [];
            if (existing.some((m) => m.id === message.id)) return s;

            const isActive = s.activeThreadId === threadId;
            const fromMe = message.sender_id === currentUserId();

            const threads = s.threads.map((t) => {
                if (t.id !== threadId) return t;
                const bump = !isActive && !fromMe ? (t.unread || 0) + 1 : t.unread;
                return {
                    ...t,
                    unread: bump,
                    last_message_at: message.created_at,
                    last_message_preview:
                        message.contenu?.slice(0, 255) ??
                        (message.image_url ? "📷 Image" : t.last_message_preview),
                };
            });
            // Remonte le fil en tête de liste
            threads.sort((a, b) =>
                (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "")
            );

            return {
                messagesByThread: {
                    ...s.messagesByThread,
                    [threadId]: [...existing, message],
                },
                threads,
                unreadTotal: recomputeUnreadTotal(threads),
            };
        });
    },

    applyThreadChange: (partial) => {
        set((s) => {
            const known = s.threads.some((t) => t.id === partial.id);
            if (!known) {
                // Nouveau fil créé ailleurs : on recharge la liste
                get().fetchThreads();
                return s;
            }
            const threads = s.threads.map((t) =>
                t.id === partial.id ? { ...t, ...partial } : t
            );
            return { threads };
        });
    },

    clearError: () => set({ error: null }),
}));
