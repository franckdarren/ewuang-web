import React from 'react'
import { ChangePasswordForm } from "@/components/profil/change-password-form"

export default function ProfilPage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* En-tête de page */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
                    <p className="text-muted-foreground">
                        Mes informations.
                    </p>
                </div>
            </div>

            {/* Contenu */}
            <div className="grid gap-4 md:grid-cols-2">
                <ChangePasswordForm />
            </div>
        </div>
    )
}
