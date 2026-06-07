"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/authStore"
import { useNotificationsStore, Notification } from "@/stores/notificationsStore"
import { supabaseBrowser } from "@/app/utils/supabase/clients"

const TYPE_LABELS: Record<string, string> = {
    message: "💬 Nouveau message",
    commande: "🛒 Commande",
    livraison: "🚚 Livraison",
    promotion: "🎁 Promotion",
    alerte_stock: "⚠️ Alerte stock",
    avis: "⭐ Avis",
    systeme: "🔔 Système",
}

export function RealtimeNotificationsProvider() {
    const user = useAuthStore(s => s.user)
    const receiveNotification = useNotificationsStore(s => s.receiveNotification)
    const router = useRouter()

    useEffect(() => {
        if (!user?.id) return

        const supabase = supabaseBrowser()
        const channel = supabase
            .channel("notifications-rt")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const notif = payload.new as Notification
                    receiveNotification(notif)

                    const typeLabel = TYPE_LABELS[notif.type] ?? "🔔 Notification"
                    toast(notif.titre, {
                        description: notif.message,
                        duration: 6000,
                        ...(notif.lien
                            ? {
                                action: {
                                    label: "Voir",
                                    onClick: () => router.push(notif.lien!),
                                },
                            }
                            : {}),
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [user?.id, receiveNotification, router])

    return null
}
