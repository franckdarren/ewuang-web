// app/dashboard/page.tsx
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
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

import data from "./data.json"

export default async function Page() {
    // Récupération des infos utilisateur
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Récupération du profil complet depuis la table users
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
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2">
                            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                                <SectionCards />
                                <div className="px-4 lg:px-6">
                                    <ChartAreaInteractive />
                                </div>
                                <DataTable data={data} />
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </UserProvider>
    )
}