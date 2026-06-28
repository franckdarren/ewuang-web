"use client"

import * as React from "react"
import Image from 'next/image'
import Link from "next/link"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconFileWord,
  IconCamera,
  IconShoppingCart,
  IconBrandPushbullet,
  IconMenuOrder,
  IconMessage,
  IconMessageCircle,
  IconSocial,
  IconLogs,
  IconTag,
  IconDeviceTv,
  IconTarget,
  IconGps,
  IconGpsFilled,
  IconLocation,
  IconTransactionDollar,
  IconMoneybag,
  IconBuildingCommunity,
  IconShieldLock,
} from "@tabler/icons-react"

import { useEffect } from "react"
import { useChatStore } from "@/stores/chatStore"
import { supabaseBrowser } from "@/app/utils/supabase/clients"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore, permissionsInclude } from "@/stores/authStore"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      permission: "stats.read",
    },
    {
      title: "Articles",
      url: "/dashboard/articles",
      icon: IconShoppingCart,
      permission: "articles.read",
    },
    {
      title: "Utilisateurs",
      url: "/dashboard/users",
      icon: IconUsers,
      permission: "users.read",
    },
    {
      title: "Commandes",
      url: "/dashboard/commandes",
      icon: IconLogs,
      permission: "commandes.read",
    },
    {
      title: "Publicités",
      url: "/dashboard/publicites",
      icon: IconDeviceTv,
      permission: "publicites.read",
    },
    {
      title: "Publicités Premium",
      url: "/dashboard/publicites-premium",
      icon: IconTarget,
      permission: "publicites_premium.read",
    },
    {
      title: "Réclamations",
      url: "/dashboard/reclamations",
      icon: IconMessage,
      permission: "reclamations.read",
    },
    {
      title: "Remboursements",
      url: "/dashboard/remboursements",
      icon: IconMoneybag,
      permission: "remboursements.read",
    },
    {
      title: "Livraisons",
      url: "/dashboard/livraisons",
      icon: IconLocation,
      permission: "livraisons.read",
    },
    {
      title: "Zones de livraison",
      url: "/dashboard/zones-livraison",
      icon: IconGps,
      permission: "zones_livraison.read",
    },
    {
      title: "Transactions",
      url: "/dashboard/transactions",
      icon: IconMoneybag,
      permission: "transactions.read",
    },
    {
      title: "Notifications",
      url: "/dashboard/notifications",
      icon: IconSocial,
      permission: "notifications.read",
    },
    {
      title: "Messages",
      url: "/dashboard/messages",
      icon: IconMessageCircle,
      permission: "messages.read",
    },
    {
      title: "Catégories",
      url: "/dashboard/categories",
      icon: IconTag,
      permission: "categories.read",
    },
    {
      title: "Boutiques",
      url: "/dashboard/boutiques",
      icon: IconBuildingCommunity,
      permission: "boutiques.read",
    },
    {
      title: "Rôles & permissions",
      url: "/dashboard/roles",
      icon: IconShieldLock,
      permission: "roles.read",
    },

  ],
  navSecondary: [
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: IconSettings,
    // },
    // {
    //   title: "Get Help",
    //   url: "#",
    //   icon: IconHelp,
    // },
    // {
    //   title: "Search",
    //   url: "#",
    //   icon: IconSearch,
    // },
  ],
  documents: [
    // {
    //   name: "Data Library",
    //   url: "#",
    //   icon: IconDatabase,
    // },
    // {
    //   name: "Reports",
    //   url: "#",
    //   icon: IconReport,
    // },
    // {
    //   name: "Word Assistant",
    //   url: "#",
    //   icon: IconFileWord,
    // },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const chatUnread = useChatStore((s) => s.unreadTotal);
  const fetchUnread = useChatStore((s) => s.fetchUnread);

  // Badge messagerie : compteur initial + rafraîchissement temps réel
  useEffect(() => {
    if (!user) return;
    fetchUnread();
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("sidebar-chat-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_threads" },
        () => fetchUnread()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnread]);

  // Filtrage RBAC : on n'affiche que les entrées dont la permission de lecture
  // est accordée (un Super Admin a ['*'] → tout est visible).
  const navMain = data.navMain
    .filter((item) => !item.permission || permissionsInclude(permissions, item.permission))
    .map((item) =>
      item.url === "/dashboard/messages"
        ? { ...item, badge: chatUnread }
        : item
    );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
              <Image
                src="/images/logo2.png"
                width={35}
                height={35}
                alt="logo"
              />
                <span className="text-base font-semibold">EWUANG Marketplace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser user={{ name: user.name, email: user.email, avatar: user.url_logo }} />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}