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

import { useState } from 'react';
import { useAuthStore, User } from '@/stores/authStore';
import { InactivityGuard } from '@/components/inactivity-guard';

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

    return <InactivityGuard>{children}</InactivityGuard>;
}
