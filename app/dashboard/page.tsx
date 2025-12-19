// app/dashboard/page.tsx
/**
 * Page Dashboard - Client Component
 * 
 * CHANGEMENT MAJEUR PAR RAPPORT À AVANT :
 * - Avant : Le layout ET la page récupéraient les données (duplication)
 * - Maintenant : Seul le layout récupère les données, la page les lit depuis Zustand
 * 
 * AVANTAGES :
 * ✅ Pas de duplication de code
 * ✅ Pas de props drilling
 * ✅ Code plus simple et plus maintenable
 * ✅ Accès aux données utilisateur n'importe où avec useAuthStore()
 * 
 * NOTE : Ce fichier doit être un Client Component car il utilise Zustand
 */

'use client';

import { useEffect } from 'react';
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { useAuthStore, useIsAdmin, useUserName } from '@/stores/authStore';

// Importer vos données de test
import data from "./data.json";

/**
 * Page Component - Client Component
 */
export default function DashboardPage() {
    // ============================================
    // RÉCUPÉRATION DES DONNÉES DU STORE
    // ============================================

    /**
     * Récupérer l'utilisateur depuis le store Zustand
     * 
     * MAGIE : Pas besoin de props ! Les données sont déjà dans le store
     * grâce au AuthProvider dans le layout
     */
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isInitialized = useAuthStore((state) => state.isInitialized);

    // Utiliser les sélecteurs personnalisés
    const isAdmin = useIsAdmin();
    const userName = useUserName();

    // ============================================
    // VÉRIFICATIONS DE SÉCURITÉ
    // ============================================

    /**
     * Vérifier que le store est initialisé
     * 
     * NOTE : Normalement, le layout s'occupe déjà de la redirection
     * si l'utilisateur n'est pas connecté. Cette vérification est une
     * sécurité supplémentaire côté client.
     */
    useEffect(() => {
        if (isInitialized && !isAuthenticated) {
            console.log('❌ Utilisateur non authentifié, redirection...');
            window.location.href = '/login';
        }
    }, [isInitialized, isAuthenticated]);

    // ============================================
    // AFFICHAGE CONDITIONNEL
    // ============================================

    /**
     * Afficher un loader pendant que le store s'initialise
     * 
     * Cela évite d'afficher des données vides pendant une fraction de seconde
     */
    if (!isInitialized || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Chargement du dashboard...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDU DU COMPOSANT
    // ============================================

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* 
                Message de bienvenue personnalisé
                On utilise directement userName du store
            */}
            <div className="px-4 lg:px-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    Bienvenue, {userName} ! 👋
                </h1>
                <p className="text-muted-foreground">
                    {isAdmin
                        ? "Vous êtes connecté en tant qu'administrateur"
                        : `Rôle : ${user.role}`
                    }
                </p>
            </div>

            {/* Cartes de statistiques */}
            <SectionCards />

            {/* Graphique */}
            <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
            </div>

            {/* Tableau de données */}
            <DataTable data={data} />
        </div>
    );
}

/**
 * COMPARAISON AVANT / APRÈS :
 * 
 * AVANT (avec votre code) :
 * ❌ Code dupliqué dans le layout ET la page
 * ❌ Récupération des données deux fois
 * ❌ Props drilling avec UserProvider
 * ❌ Difficile à maintenir
 * 
 * APRÈS (avec Zustand) :
 * ✅ Code centralisé dans le layout uniquement
 * ✅ Récupération des données une seule fois
 * ✅ Pas de props drilling, juste useAuthStore()
 * ✅ Facile à maintenir et à étendre
 * ✅ Les données sont disponibles partout
 * 
 * EXEMPLES D'UTILISATION DANS D'AUTRES COMPOSANTS :
 * 
 * Dans n'importe quel composant enfant :
 * 
 * ```typescript
 * 'use client';
 * import { useAuthStore, useIsAdmin } from '@/stores/authStore';
 * 
 * function MonComposant() {
 *   const user = useAuthStore((state) => state.user);
 *   const isAdmin = useIsAdmin();
 *   
 *   return (
 *     <div>
 *       Bonjour {user?.name}
 *       {isAdmin && <p>Tu es admin !</p>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * C'est aussi simple que ça ! 🎉
 */