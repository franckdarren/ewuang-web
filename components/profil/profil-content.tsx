"use client"

import React from "react"
import { useAuthStore } from "@/stores/authStore"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ProfileInfoForm } from "@/components/profil/profile-info-form"
import { ChangePasswordForm } from "@/components/profil/change-password-form"

function ProfilSkeleton() {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Carte infos */}
            <Card>
                <CardHeader className="gap-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-9 w-36" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-9 w-32" />
                    </div>
                </CardContent>
            </Card>

            {/* Carte mot de passe */}
            <Card>
                <CardHeader className="gap-2">
                    <Skeleton className="h-6 w-52" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <Skeleton className="h-9 w-32" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function ProfilContent() {
    const user = useAuthStore((s) => s.user)
    const isInitialized = useAuthStore((s) => s.isInitialized)

    // Tant que le store n'est pas prêt, on affiche le skeleton. Cela évite aussi
    // que les formulaires se montent avec des valeurs initiales vides.
    if (!isInitialized || !user) {
        return <ProfilSkeleton />
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <ProfileInfoForm />
            <ChangePasswordForm />
        </div>
    )
}
