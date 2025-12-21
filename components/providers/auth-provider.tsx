// components/providers/auth-provider.tsx
/**
 * AuthProvider - Provider pour initialiser Zustand avec les données du serveur
 * 
 * CE COMPOSANT EST CRUCIAL pour faire le pont entre :
 * - Le Server Component (layout) qui récupère les données Supabase
 * - Le Client Component qui utilise Zustand
 * 
 * FONCTIONNEMENT :
 * 1. Le layout (Server Component) récupère les données utilisateur
 * 2. Il passe ces données au AuthProvider en tant que props
 * 3. Le AuthProvider (Client Component) initialise le store Zustand
 * 4. Tous les composants enfants peuvent utiliser le store
 * 
 * C'est le pattern recommandé pour Next.js 13+ App Router avec Zustand
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore, User } from '@/stores/authStore';

// ============================================
// INTERFACE DES PROPS
// ============================================

interface AuthProviderProps {
    children: React.ReactNode;
    initialUser: User;
    initialToken: string;
}

/**
 * AuthProvider Component
 * 
 * @param children - Les composants enfants qui auront accès au store
 * @param initialUser - L'utilisateur récupéré côté serveur
 * @param initialToken - Le token Supabase récupéré côté serveur
 */
export function AuthProvider({
    children,
    initialUser,
    initialToken
}: AuthProviderProps) {
    // Référence pour s'assurer qu'on initialise qu'une seule fois
    const initialized = useRef(false);

    // Récupérer les fonctions du store
    const { initializeAuth, isInitialized } = useAuthStore();

    /**
     * Initialiser le store au montage du composant
     * 
     * IMPORTANT : On utilise useEffect avec initialized.current
     * pour s'assurer que l'initialisation ne se fait qu'UNE SEULE FOIS,
     * même en mode développement où React peut monter le composant deux fois.
     */
    useEffect(() => {
        // Si déjà initialisé, ne rien faire
        if (initialized.current || isInitialized) {
            console.log('ℹ️ AuthStore déjà initialisé, skip');
            return;
        }

        // Initialiser le store avec les données du serveur
        // console.log('🚀 Initialisation du AuthStore avec les données serveur');
        initializeAuth(initialUser, initialToken);

        // Marquer comme initialisé
        initialized.current = true;

    }, []); // Tableau vide = exécuter une seule fois au montage

    // Rendre les enfants
    // Tous les composants enfants peuvent maintenant accéder au authStore
    return <>{children}</>;
}