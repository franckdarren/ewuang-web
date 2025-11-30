"use client"

import { useState } from "react"
import { IconLogout, IconNotification, IconUserCircle, IconDotsVertical } from "@tabler/icons-react"
import { Loader2, UserCircle } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useUserStore } from "../lib/stores/user-store"
import { logoutAction } from "@/app/login/actions"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string | null
  }
}) {
  const { isMobile } = useSidebar()
  const clearUser = useUserStore((state) => state.clearUser)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logoutAction()
      clearUser()
      // Redirection instantanée vers login
      window.location.href = "/login"
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              disabled={isLoggingOut}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-2"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale flex items-center justify-center">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <UserCircle className="h-8 w-8" />
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <div className="ml-auto">
                {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconDotsVertical className="ml-auto size-4" />}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg grayscale flex items-center justify-center">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <UserCircle className="h-8 w-8" />
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/dashboard/profil" className="flex gap-2 items-center">
                  <IconUserCircle /> Mon compte
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Link href="/dashboard/notifications" className="flex gap-2 items-center">
                  <IconNotification /> Notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="cursor-pointer flex items-center gap-2"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Déconnexion...
                </>
              ) : (
                <>
                  <IconLogout /> Se déconnecter
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
