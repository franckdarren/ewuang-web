// app/dashboard/commandes/page.tsx
'use client';

import React from 'react';
import { useCommandesStore } from '@/stores/commandesStore';
import { type Commande } from '@/stores/types/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    ShoppingBag,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Truck,
    RefreshCw,
    Package,
} from "lucide-react";
import { CommandesTable } from "@/components/commandes/commandes-table";
import { CommandeViewModal } from "@/components/commandes/commande-view-modal";

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function CommandesPage() {
    // ========== STORE ==========
    const {
        commandes,
        isLoading,
        stats,
        pagination,
        fetchCommandes,
        deleteCommande,
        updateStatut,
    } = useCommandesStore();

    // ========== STATE LOCAL ==========
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [selectedCommande, setSelectedCommande] = React.useState<Commande | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [commandeToDelete, setCommandeToDelete] = React.useState<Commande | undefined>(undefined);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    // ========== EFFECTS ==========

    React.useEffect(() => {
        fetchCommandes({ page: 1 }).finally(() => setIsInitialLoading(false));
    }, [fetchCommandes]);

    // ========== HANDLERS ==========

    const handleView = (commande: Commande) => {
        setSelectedCommande(commande);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedCommande(undefined);
    };

    const handleDelete = (commande: Commande) => {
        setCommandeToDelete(commande);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!commandeToDelete) return;
        await deleteCommande(commandeToDelete.id);
        setIsDeleteDialogOpen(false);
        setCommandeToDelete(undefined);
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setCommandeToDelete(undefined);
    };

    const handleUpdateStatut = async (commande: Commande, nouveauStatut: string) => {
        await updateStatut(commande.id, nouveauStatut as any);
    };

    // ========== STATS CALCULÉES ==========

    const statsByStatut = React.useMemo(() => {
        const acc: Record<string, number> = {};
        commandes.forEach((cmd) => {
            const s = (cmd.statut as string) ?? 'inconnu';
            acc[s] = (acc[s] ?? 0) + 1;
        });
        return acc;
    }, [commandes]);

    const countByGroup = React.useMemo(() => {
        let enAttente = 0;
        let enCours = 0;
        let livrees = 0;
        let annulees = 0;

        commandes.forEach((cmd) => {
            const s = ((cmd.statut as string) ?? '').toLowerCase();
            if (s.includes('attente')) enAttente++;
            else if (s.includes('annul') || s.includes('rembours')) annulees++;
            else if (s.includes('livr') && !s.includes('livraison')) livrees++;
            else enCours++;
        });

        return { enAttente, enCours, livrees, annulees };
    }, [commandes]);

    const montantTotal = React.useMemo(
        () => commandes.reduce((acc, cmd) => acc + (cmd.prix ?? 0), 0),
        [commandes]
    );

    // ========== RENDER ==========

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Skeleton en-tête */}
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-4 w-72" />
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
                        {Array.from({ length: 6 }).map((_, i) => (
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
                    <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
                    <p className="text-muted-foreground">
                        Gérez et suivez toutes les commandes de la plateforme
                    </p>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1">
                    {pagination.totalItems} commande{pagination.totalItems > 1 ? 's' : ''} au total
                </Badge>
            </div>

            {/* ========== STATISTIQUES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* En attente */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            En attente
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-amber-600">
                            {countByGroup.enAttente}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Commandes à traiter
                        </p>
                    </CardContent>
                </Card>

                {/* En cours */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            En cours
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-600">
                            {countByGroup.enCours}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Préparation ou livraison
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
                            {countByGroup.livrees}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Commandes finalisées
                        </p>
                    </CardContent>
                </Card>

                {/* Annulées / Remboursées */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            Annulées
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-red-600">
                            {countByGroup.annulees}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Annulées ou remboursées
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========== RÉSUMÉ FINANCIER ========== */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Chiffre d'affaires (page courante)
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold">
                            {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'XAF',
                                maximumFractionDigits: 0,
                            }).format(montantTotal)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {commandes.length} commandes
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                Moy.{" "}
                                {commandes.length > 0
                                    ? new Intl.NumberFormat('fr-FR', {
                                        style: 'currency',
                                        currency: 'XAF',
                                        maximumFractionDigits: 0,
                                    }).format(montantTotal / commandes.length)
                                    : '0 XAF'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Répartition des statuts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(statsByStatut).map(([statut, count]) => (
                                <Badge key={statut} variant="outline" className="text-xs">
                                    {statut} : {count}
                                </Badge>
                            ))}
                            {Object.keys(statsByStatut).length === 0 && (
                                <span className="text-xs text-muted-foreground">Aucune donnée</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ========== TABLEAU DES COMMANDES ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les commandes</CardTitle>
                    <CardDescription>
                        Consultez, filtrez et gérez l'ensemble des commandes de la plateforme
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CommandesTable
                        commandes={commandes}
                        isLoading={isLoading}
                        onView={handleView}
                        onDelete={handleDelete}
                        onUpdateStatut={handleUpdateStatut}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE VISUALISATION ========== */}
            <CommandeViewModal
                open={isViewModalOpen}
                onClose={handleCloseViewModal}
                commande={selectedCommande}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La commande{" "}
                            <span className="font-semibold">#{commandeToDelete?.numero}</span> sera
                            définitivement supprimée de la base de données.
                            <br /><br />
                            <span className="text-orange-600 font-medium">
                                ⚠️ Toutes les données associées (articles, livraison) seront également supprimées.
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
