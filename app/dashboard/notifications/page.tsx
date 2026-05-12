// app/dashboard/notifications/page.tsx
'use client';

import React from 'react';
import { useNotificationsStore, type Notification, type NotificationType } from '@/stores/notificationsStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Bell,
    BellOff,
    CheckCheck,
    Send,
    Inbox,
    ShoppingCart,
    Truck,
    MessageCircle,
    Tag,
    AlertTriangle,
    Star,
    Settings,
} from "lucide-react";
import { NotificationsTable } from "@/components/notifications/notifications-table";
import { NotificationSendModal } from "@/components/notifications/notification-send-modal";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================
// HELPERS
// ============================================

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
    commande:     ShoppingCart,
    livraison:    Truck,
    message:      MessageCircle,
    promotion:    Tag,
    alerte_stock: AlertTriangle,
    avis:         Star,
    systeme:      Settings,
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function NotificationsPage() {
    // ========== STORE ==========
    const {
        notifications,
        isLoading,
        stats,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotificationsStore();

    // ========== STATE LOCAL ==========
    const [isSendModalOpen, setIsSendModalOpen] = React.useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [notificationToDelete, setNotificationToDelete] = React.useState<Notification | undefined>(undefined);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    // ========== EFFECTS ==========
    React.useEffect(() => {
        fetchNotifications().finally(() => setIsInitialLoading(false));
    }, [fetchNotifications]);

    // ========== HANDLERS ==========

    const handleMarkAsRead = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const handleDelete = (notification: Notification) => {
        setNotificationToDelete(notification);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!notificationToDelete) return;
        await deleteNotification(notificationToDelete.id);
        setIsDeleteDialogOpen(false);
        setNotificationToDelete(undefined);
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setNotificationToDelete(undefined);
    };

    // ========== TOP TYPES ==========
    const topTypes = Object.entries(stats.par_type)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3) as [NotificationType, number][];

    // ========== RENDER ==========

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Skeleton en-tête */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-36" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>

                {/* Skeleton stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-9 w-16 mt-1" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Skeleton tableau */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-64 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">
                        Gérez et envoyez des notifications aux utilisateurs
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {stats.non_lues > 0 && (
                        <Button variant="outline" onClick={handleMarkAllAsRead} disabled={isLoading}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Tout marquer comme lu
                        </Button>
                    )}
                    <Button onClick={() => setIsSendModalOpen(true)}>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer une notification
                    </Button>
                </div>
            </div>

            {/* ========== STATISTIQUES PRINCIPALES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Inbox className="h-4 w-4" />
                            Total des notifications
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.lues} lues
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {stats.non_lues} non lues
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Non lues */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-blue-600" />
                            Non lues
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-600">
                            {stats.non_lues}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            En attente de lecture
                        </p>
                    </CardContent>
                </Card>

                {/* Lues */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <BellOff className="h-4 w-4 text-green-600" />
                            Lues
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">
                            {stats.lues}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Déjà consultées
                        </p>
                    </CardContent>
                </Card>

                {/* Top type */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-orange-600" />
                            Répartition par type
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-orange-600">
                            {topTypes.length > 0 ? topTypes[0][1] : 0}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topTypes.length > 0 ? (
                            <p className="text-xs text-muted-foreground capitalize">
                                Type principal : {topTypes[0][0].replace('_', ' ')}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">Aucune notification</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ========== APERÇU DES NOTIFICATIONS NON LUES ========== */}
            {stats.non_lues > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Notifications non lues récentes</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {notifications
                            .filter(n => !n.is_read)
                            .slice(0, 3)
                            .map((notification) => {
                                const Icon = TYPE_ICONS[notification.type] ?? Bell;
                                return (
                                    <Card key={notification.id} className="overflow-hidden border-l-4 border-l-blue-500">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-blue-600 shrink-0" />
                                                    <CardTitle className="text-sm line-clamp-1">
                                                        {notification.titre}
                                                    </CardTitle>
                                                </div>
                                                <Badge variant="default" className="shrink-0 text-xs">
                                                    Non lue
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {notification.type.replace('_', ' ')}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notification)}
                                                >
                                                    <CheckCheck className="mr-1 h-3 w-3" />
                                                    Marquer lue
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* ========== RÉPARTITION PAR TYPE ========== */}
            {topTypes.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Répartition par type</h2>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                        {(Object.entries(stats.par_type) as [NotificationType, number][]).map(([type, count]) => {
                            const Icon = TYPE_ICONS[type] ?? Bell;
                            return (
                                <Card key={type} className={`text-center ${count === 0 ? 'opacity-40' : ''}`}>
                                    <CardContent className="pt-4 pb-3 px-3">
                                        <Icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-2xl font-bold">{count}</p>
                                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                            {type.replace('_', ' ')}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ========== TABLEAU DES NOTIFICATIONS ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les notifications</CardTitle>
                    <CardDescription>
                        Consultez et gérez toutes vos notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <NotificationsTable
                        notifications={notifications}
                        isLoading={isLoading}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL D'ENVOI ========== */}
            <NotificationSendModal
                open={isSendModalOpen}
                onClose={() => setIsSendModalOpen(false)}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La notification{" "}
                            <span className="font-semibold">{notificationToDelete?.titre}</span> sera
                            définitivement supprimée.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Supprimer définitivement
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
