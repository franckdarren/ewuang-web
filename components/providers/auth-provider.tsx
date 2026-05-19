// components/providers/auth-provider.tsx
/**
 * AuthProvider - Provider pour initialiser Zustand avec les données du serveur
 *
 * Le token frais venant du DashboardLayout (Server Component) est injecté
 * SYNCHRONEMENT dans le store Zustand via useState lazy initialization.
 *
 * POURQUOI synchrone et pas useEffect ?
 * React exécute les useEffect des enfants AVANT ceux des parents.
 * Si on utilisait useEffect, les pages enfants (ex: categories/page.tsx)
 * feraient leurs appels API avec l'ancien token (localStorage) AVANT que
 * le provider ait eu le temps de mettre à jour le store avec le nouveau token.
 * useState lazy init s'exécute pendant le rendu, avant tout effet enfant.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, User } from '@/stores/authStore';
import { InactivityGuard } from '@/components/inactivity-guard';

// L'access token Supabase expire ~1h. On le rafraîchit bien avant.
const REFRESH_INTERVAL_MS = 20 * 60 * 1000; // 20 min

interface AuthProviderProps {
    children: React.ReactNode;
    initialUser: User;
    initialToken: string;
}

export function AuthProvider({
    children,
    initialUser,
    initialToken
}: AuthProviderProps) {
    // Initialisation synchrone du store au premier rendu.
    // useState lazy init s'exécute une seule fois, avant le rendu des enfants
    // et avant tout useEffect — garantit que le bon token est toujours en place.
    useState(() => {
        useAuthStore.getState().initializeAuth(initialUser, initialToken);
    });

    // Rafraîchissement proactif du token : périodiquement et au retour sur
    // l'onglet (après une mise en veille / longue inactivité). Évite que le
    // token persistant dans le store expire pendant une session SPA.
    useEffect(() => {
        const refresh = () => {
            void useAuthStore.getState().refreshAccessToken();
        };

        const interval = setInterval(refresh, REFRESH_INTERVAL_MS);

        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', refresh);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', refresh);
        };
    }, []);

    return <InactivityGuard>{children}</InactivityGuard>;
}
