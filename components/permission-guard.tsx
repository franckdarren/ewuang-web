"use client"

/**
 * PermissionGuard — protège un sous-arbre selon une permission RBAC.
 *
 * Rend `children` uniquement si l'utilisateur possède `permission`
 * (Super Admin = ['*'] passe toujours). Sinon redirige vers /403.
 *
 * À utiliser en tête des pages /dashboard/* qui nécessitent un droit précis,
 * en complément du middleware (qui ne contrôle que le rôle Administrateur).
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore, useHasPermission } from "@/stores/authStore"

export function PermissionGuard({
    permission,
    children,
}: {
    permission: string
    children: React.ReactNode
}) {
    const router = useRouter()
    const isInitialized = useAuthStore((s) => s.isInitialized)
    const allowed = useHasPermission(permission)

    useEffect(() => {
        if (isInitialized && !allowed) {
            router.replace("/403")
        }
    }, [isInitialized, allowed, router])

    if (!allowed) return null
    return <>{children}</>
}
