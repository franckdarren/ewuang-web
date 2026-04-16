"use client"

import { type Icon } from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  useEffect(() => {
    setPendingUrl(null)
  }, [pathname])

  const activeUrl = pendingUrl ?? pathname

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url === "/dashboard"
                ? activeUrl === "/dashboard"
                : activeUrl?.startsWith(item.url) ?? false

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  className={
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-white"
                      : ""
                  }
                  onClick={() => {
                    setPendingUrl(item.url)
                    router.push(item.url)
                  }}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
