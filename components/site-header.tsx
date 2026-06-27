"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { useChatStore } from "@/stores/chatStore"

export function SiteHeader() {
  const pathname = usePathname() || "/dashboard"
  const unread = useChatStore((s) => s.unreadTotal)

  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/articles": "Articles",
    "/dashboard/users": "Utilisateurs",
    "/dashboard/commandes": "Commandes",
    "/dashboard/publicites": "Publicités",
  }

  const title = titles[pathname] || "Dashboard"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        {/* <h1 className="text-base font-medium">{title}</h1> */}

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard/messages"
            className="relative rounded-md p-2 hover:bg-accent"
            aria-label="Messages"
          >
            <MessageCircle className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold text-white leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
