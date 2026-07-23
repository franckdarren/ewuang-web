"use client"

import React from "react"
import { toast } from "sonner"
import { Camera, Loader2, UserCircle } from "lucide-react"
import { apiFetch } from "@/app/lib/apiFetch"
import { useAuthStore } from "@/stores/authStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo
const ALLOWED = ["image/jpeg", "image/png", "image/webp"]

export function ProfileInfoForm() {
    const user = useAuthStore((s) => s.user)
    const setUser = useAuthStore((s) => s.setUser)

    const [name, setName] = React.useState(user?.name ?? "")
    const [phone, setPhone] = React.useState(user?.phone ?? "")
    const [address, setAddress] = React.useState(user?.address ?? "")
    const [description, setDescription] = React.useState(user?.description ?? "")

    // Photo : fichier en attente + aperçu (object URL) ou URL courante
    const [pendingFile, setPendingFile] = React.useState<File | null>(null)
    const [preview, setPreview] = React.useState<string | null>(user?.url_logo ?? null)
    const [saving, setSaving] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Nettoie l'object URL d'aperçu quand il change / au démontage
    React.useEffect(() => {
        if (!pendingFile) return
        const objectUrl = URL.createObjectURL(pendingFile)
        setPreview(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [pendingFile])

    if (!user) return null

    const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = "" // permet de re-sélectionner le même fichier
        if (!file) return
        if (!ALLOWED.includes(file.type)) {
            toast.error("Format non supporté", { description: "JPEG, PNG ou WebP uniquement." })
            return
        }
        if (file.size > MAX_SIZE) {
            toast.error("Image trop volumineuse", { description: "5 Mo maximum." })
            return
        }
        setPendingFile(file)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (name.trim().length < 3) {
            toast.error("Le nom doit contenir au moins 3 caractères")
            return
        }

        setSaving(true)
        try {
            let urlLogo = user!.url_logo

            // 1) Upload de la nouvelle photo si une a été choisie
            if (pendingFile) {
                const formData = new FormData()
                formData.append("file", pendingFile)
                const upRes = await apiFetch("/api/upload/avatar", {
                    method: "POST",
                    body: formData,
                })
                const upData = await upRes.json().catch(() => ({}))
                if (!upRes.ok || !upData?.success) {
                    toast.error("Échec de l'upload de la photo", {
                        description: upData?.error || undefined,
                    })
                    return
                }
                urlLogo = upData.data.url
            }

            // 2) Mise à jour du profil
            const res = await apiFetch("/api/users/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    description: description.trim(),
                    url_logo: urlLogo ?? undefined,
                }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                const message =
                    data?.error ||
                    data?.errors?.[0]?.message ||
                    "Impossible de mettre à jour le profil"
                toast.error(message)
                return
            }

            // 3) Store à jour → avatar/infos visibles partout (sidebar, etc.)
            setUser(data.user)
            setPendingFile(null)
            setPreview(data.user.url_logo ?? null)
            toast.success("Profil mis à jour")
        } catch {
            toast.error("Erreur réseau, veuillez réessayer")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mes informations</CardTitle>
                <CardDescription>
                    Mettez à jour votre photo et vos coordonnées.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Photo de profil */}
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 flex items-center justify-center">
                            <AvatarImage src={preview || undefined} alt={name} />
                            <UserCircle className="h-20 w-20 text-muted-foreground" />
                        </Avatar>
                        <div className="flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={saving}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Changer la photo
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                JPEG, PNG ou WebP — 5 Mo max. Enregistrez pour appliquer.
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handlePickFile}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name">Nom</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user.email} disabled readOnly />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+241 XX XX XX XX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="address">Adresse</Label>
                            <Input
                                id="address"
                                placeholder="Libreville, Gabon"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            rows={3}
                            placeholder="Quelques mots à propos de vous"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
