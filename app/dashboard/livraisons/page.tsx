// app/dashboard/livraisons/page.tsx
'use client';

import React from 'react';
import { useLivraisonsStore, type Livraison } from '@/stores/livraisonsStore';
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
    Truck,
    Clock,
    CheckCircle,
    XCircle,
    Package,
    MapPin,
    Calendar,
} from "lucide-react";
import { LivraisonsTable } from "@/components/livraisons/livraisons-table";
import { LivraisonViewModal } from "@/components/livraisons/livraison-view-modal";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function LivraisonsPage() {
    // ========== STORE ==========
    const {
        livraisons,
        isLoading,
        stats,
        fetchLivraisons,
        deleteLivraison,
    } = useLivraisonsStore();

    // ========== STATE LOCAL ==========
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [selectedLivraison, setSelectedLivraison] = React.useState<Livraison | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [livraisonToDelete, setLivraisonToDelete] = React.useState<Livraison | undefined>(undefined);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    // ========== EFFECTS ==========

    React.useEffect(() => {
        fetchLivraisons().finally(() => setIsInitialLoading(false));
    }, [fetchLivraisons]);

    // ========== HANDLERS ==========

    const handleView = (livraison: Livraison) => {
        setSelectedLivraison(livraison);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedLivraison(undefined);
    };

    const handleDelete = (livraison: Livraison) => {
        setLivraisonToDelete(livraison);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!livraisonToDelete) return;
        await deleteLivraison(livraisonToDelete.id);
        setIsDeleteDialogOpen(false);
        setLivraisonToDelete(undefined);
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setLivraisonToDelete(undefined);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // ========== RENDER LOADING ==========

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Skeleton en-tête */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-4 w-72" />
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

                {/* Skeleton livraisons en cours */}
                <div className="space-y-3">
                    <Skeleton className="h-7 w-52" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-5 w-36" />
                                    <Skeleton className="h-4 w-48 mt-1" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
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

    // ========== RENDER PRINCIPAL ==========

    const livraisonsEnCours = livraisons.filter(l => {
        const s = l.statut?.toLowerCase() ?? '';
        return s.includes('cours') || s.includes('attribu');
    });

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Livraisons</h1>
                    <p className="text-muted-foreground">
                        Suivez et gérez toutes les livraisons de la plateforme
                    </p>
                </div>
            </div>

            {/* ========== STATISTIQUES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Total des livraisons
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.en_attente} en attente
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {stats.en_cours} en cours
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* En cours */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-orange-600" />
                            En cours
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-orange-600">
                            {stats.en_cours}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Livraisons en transit
                        </p>
                    </CardContent>
                </Card>

                {/* Livrées */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Livrées
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">
                            {stats.livrees}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Livraisons effectuées
                        </p>
                    </CardContent>
                </Card>

                {/* En attente */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            En attente
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-amber-600">
                            {stats.en_attente}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            En attente d'attribution
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========== LIVRAISONS EN COURS ========== */}
            {livraisonsEnCours.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Livraisons en cours</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {livraisonsEnCours.slice(0, 3).map((livraison) => (
                            <Card key={livraison.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-sm font-semibold">
                                                {livraison.users?.name ?? 'Client inconnu'}
                                            </CardTitle>
                                            {livraison.commandes && (
                                                <CardDescription className="text-xs font-mono">
                                                    Commande #{livraison.commandes.numero}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-orange-600 border-orange-300 bg-orange-50 shrink-0"
                                        >
                                            <Truck className="mr-1 h-3 w-3" />
                                            En cours
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        <span className="line-clamp-1">{livraison.adresse}, {livraison.ville}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Prévue le {formatDate(livraison.date_livraison)}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => handleView(livraison)}
                                        >
                                            Voir détails
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ========== TABLEAU DES LIVRAISONS ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les livraisons</CardTitle>
                    <CardDescription>
                        Consultez et gérez l'ensemble des livraisons de la plateforme
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LivraisonsTable
                        livraisons={livraisons}
                        isLoading={isLoading}
                        onView={handleView}
                        onDelete={handleDelete}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE VISUALISATION ========== */}
            <LivraisonViewModal
                open={isViewModalOpen}
                onClose={handleCloseViewModal}
                livraison={selectedLivraison}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La livraison associée à la commande{" "}
                            {livraisonToDelete?.commandes && (
                                <span className="font-semibold">
                                    #{livraisonToDelete.commandes.numero}
                                </span>
                            )}{" "}
                            sera définitivement supprimée.
                            <br /><br />
                            <span className="text-orange-600 font-medium">
                                ⚠️ La commande repassera en statut "En préparation".
                            </span>
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
