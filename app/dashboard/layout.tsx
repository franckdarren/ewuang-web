// app/dashboard/layout.tsx
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { createClient } from "@/app/utils/supabase/serveur"
import { redirect } from "next/navigation"
import { UserProvider } from "@/components/providers/user-provider"
import { UserData } from "../../lib/stores/user-store"
import { supabaseAdmin } from "../lib/supabaseAdmin"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Récupération des infos utilisateur (une seule fois pour tout le dashboard)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Récupération du profil complet
    const { data: profile } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

    if (!profile) {
        redirect("/erreur");
    }

    // Données utilisateur pour Zustand
    const userData: UserData = {
        id: user.id,
        email: user.email || "",
        role: profile.role || "Utilisateur",
        name: profile.name || user.email?.split("@")[0] || "Utilisateur",
        avatar: profile.avatar_url || null,
    };

    return (
        <UserProvider initialUser={userData}>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset >
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2">
                            {/* Le contenu des pages enfants s'affiche ici */}
                            {children}
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </UserProvider>
    )
}