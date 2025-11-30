// lib/stores/user-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UserData {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string | null;
}

interface UserState {
    user: UserData | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: UserData | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    clearUser: () => void;
}

export const useUserStore = create<UserState>()(
    devtools(
        persist(
            (set) => ({
                user: null,
                isLoading: true,
                error: null,

                setUser: (user) => set({ user, isLoading: false, error: null }),

                setLoading: (isLoading) => set({ isLoading }),

                setError: (error) => set({ error, isLoading: false }),

                clearUser: () => set({ user: null, isLoading: false, error: null }),
            }),
            {
                name: 'user-storage', // Nom dans localStorage
                partialize: (state) => ({ user: state.user }), // Persister uniquement l'user
            }
        ),
        { name: 'UserStore' }
    )
);