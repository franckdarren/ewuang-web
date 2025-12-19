import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { createClient } from "@/app/utils/supabase/serveur";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/providers/auth-provider";
import { User } from "@/stores/authStore";
import { supabaseAdmin } from "../lib/supabaseAdmin";

/**
 * Layout Component - Server Component
 */
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log('🔄 DashboardLayout : Vérification de l\'authentification...');

    // ============================================
    // ÉTAPE 1 : VÉRIFIER L'AUTHENTIFICATION SUPABASE
    // ============================================

    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    // Si pas d'utilisateur authentifié, rediriger vers login
    if (!authUser || authError) {
        console.log('❌ Utilisateur non authentifié, redirection vers /login');
        redirect("/login");
    }

    // Récupérer le token de session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.log('❌ Pas de session active, redirection vers /login');
        redirect("/login");
    }

    // console.log('✅ Utilisateur authentifié:', authUser.email);

    // ============================================
    // ÉTAPE 2 : RÉCUPÉRER LE PROFIL COMPLET
    // ============================================

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("auth_id", authUser.id)
        .single();

    // Si le profil n'existe pas, il y a un problème
    if (!profile || profileError) {
        console.error('❌ Profil utilisateur introuvable:', profileError);
        redirect("/erreur");
    }

    // console.log('✅ Profil chargé:', profile.email, '- Rôle:', profile.role);

    // ============================================
    // ÉTAPE 3 : CONSTRUIRE L'OBJET USER POUR ZUSTAND
    // ============================================

    /**
     * Créer l'objet User avec toutes les données nécessaires
     * Cet objet correspond exactement au type User du authStore
     */
    const userData: User = {
        // IDs
        id: profile.id,
        auth_id: profile.auth_id,

        // Informations de base
        name: profile.name,
        email: profile.email,
        role: profile.role as 'Client' | 'Boutique' | 'Livreur' | 'Administrateur',

        // Informations complémentaires
        url_logo: profile.url_logo,
        phone: profile.phone,
        address: profile.address,
        description: profile.description,

        // Horaires (pour les boutiques)
        heure_ouverture: profile.heure_ouverture,
        heure_fermeture: profile.heure_fermeture,

        // Status
        solde: profile.solde,
        is_verified: profile.is_verified,
        is_active: profile.is_active,

        // Timestamps
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    };

    // Le token d'accès Supabase
    const token = session.access_token;

    // ============================================
    // ÉTAPE 4 : VÉRIFIER LES PERMISSIONS
    // ============================================

    /**
     * Vérifier que l'utilisateur a le droit d'accéder au dashboard
     * Vous pouvez personnaliser cette logique selon vos besoins
     */

    // Si le compte n'est pas actif, bloquer l'accès
    if (!profile.is_active) {
        console.log('❌ Compte désactivé, redirection vers /login');
        redirect("/login");
    }

    // Optionnel : Vérifier le rôle
    // Par exemple, si seuls les admins et boutiques peuvent accéder au dashboard :
    // if (!['admin', 'boutique'].includes(profile.role)) {
    //     console.log('❌ Accès non autorisé pour le rôle:', profile.role);
    //     redirect("/non-autorise");
    // }

    // console.log('✅ Accès au dashboard autorisé');

    // ============================================
    // ÉTAPE 5 : RENDU AVEC LE AUTHPROVIDER
    // ============================================

    /**
     * Envelopper toute l'application dans le AuthProvider
     * 
     * IMPORTANT :
     * - AuthProvider est un Client Component ('use client')
     * - Il initialise le authStore avec les données du serveur
     * - Tous les composants enfants peuvent utiliser useAuthStore()
     * 
     * L'ordre des providers est important :
     * 1. AuthProvider : initialise les données utilisateur
     * 2. SidebarProvider : gère l'état de la sidebar
     * 3. Le reste de l'UI
     */
    return (
        <AuthProvider initialUser={userData} initialToken={token}>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2">
                            {/* 
                                Le contenu des pages enfants s'affiche ici
                                Toutes ces pages peuvent maintenant utiliser useAuthStore()
                                sans avoir besoin de recevoir les données en props !
                            */}
                            {children}
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </AuthProvider>
    );
}

/**
 * NOTES IMPORTANTES :
 * 
 * 1. Ce layout est un Server Component
 *    → Il s'exécute côté serveur
 *    → Il peut accéder directement à Supabase
 *    → Il ne peut PAS utiliser de hooks React (useState, useEffect, etc.)
 * 
 * 2. AuthProvider est un Client Component
 *    → Il s'exécute côté client (navigateur)
 *    → Il peut utiliser les hooks React
 *    → Il initialise le store Zustand
 * 
 * 3. Les pages enfants peuvent être des Client Components
 *    → Ajoutez 'use client' en haut du fichier
 *    → Utilisez useAuthStore() pour accéder aux données
 * 
 * 4. Avantages de cette approche :
 *    ✅ Authentification sécurisée côté serveur
 *    ✅ Données utilisateur disponibles partout via Zustand
 *    ✅ Pas besoin de prop drilling
 *    ✅ Pas de duplication de code
 *    ✅ Performance optimale
 */