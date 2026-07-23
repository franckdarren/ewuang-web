"use client"

import React from "react"
import { toast } from "sonner"
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { apiFetch } from "@/app/lib/apiFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = React.useState("")
    const [newPassword, setNewPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")
    const [show, setShow] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    const reset = () => {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Veuillez remplir tous les champs")
            return
        }
        if (newPassword.length < 6) {
            toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("Les deux mots de passe ne correspondent pas")
            return
        }
        if (newPassword === currentPassword) {
            toast.error("Le nouveau mot de passe doit être différent de l'ancien")
            return
        }

        setIsSubmitting(true)
        try {
            const res = await apiFetch("/api/auth/change-password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                const message =
                    data?.error ||
                    data?.errors?.[0]?.message ||
                    "Impossible de changer le mot de passe"
                toast.error(message)
                return
            }

            toast.success("Mot de passe changé avec succès")
            reset()
        } catch {
            toast.error("Erreur réseau, veuillez réessayer")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Changer le mot de passe
                </CardTitle>
                <CardDescription>
                    Pour votre sécurité, vous devez saisir votre mot de passe actuel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="current_password">Mot de passe actuel</Label>
                        <Input
                            id="current_password"
                            type={show ? "text" : "password"}
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="new_password">Nouveau mot de passe</Label>
                        <Input
                            id="new_password"
                            type={show ? "text" : "password"}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
                        <Input
                            id="confirm_password"
                            type={show ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground"
                            onClick={() => setShow((v) => !v)}
                            disabled={isSubmitting}
                        >
                            {show ? (
                                <EyeOff className="mr-1 h-4 w-4" />
                            ) : (
                                <Eye className="mr-1 h-4 w-4" />
                            )}
                            {show ? "Masquer" : "Afficher"} les mots de passe
                        </Button>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
