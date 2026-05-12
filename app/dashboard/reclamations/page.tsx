// app/dashboard/reclamations/page.tsx
'use client';

import React from 'react';
import { useReclamationsStore, type Reclamation } from '@/stores/reclamationsStore';
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
    TrendingUp,
    Clock,
    RefreshCw,
    XCircle,
    CheckCircle,
} from "lucide-react";
import { ReclamationsTable } from "@/components/reclamations/reclamations-table";
import { ReclamationViewModal } from "@/components/reclamations/reclamation-view-modal";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ReclamationsPage() {
    // ========== STORE ==========
    const {
        reclamations,
        isLoading,
        stats,
        fetchReclamations,
        deleteReclamation,
    } = useReclamationsStore();

    // ========== STATE LOCAL ==========
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [selectedReclamation, setSelectedReclamation] = React.useState<Reclamation | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [reclamationToDelete, setReclamationToDelete] = React.useState<Reclamation | undefined>(undefined);
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);

    // ========== EFFECTS ==========

    React.useEffect(() => {
        fetchReclamations().finally(() => setIsInitialLoading(false));
    }, [fetchReclamations]);

    // ========== HANDLERS ==========

    const handleView = (reclamation: Reclamation) => {
        setSelectedReclamation(reclamation);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedReclamation(undefined);
    };

    const handleDelete = (reclamation: Reclamation) => {
        setReclamationToDelete(reclamation);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!reclamationToDelete) return;
        await deleteReclamation(reclamationToDelete.id);
        setIsDeleteDialogOpen(false);
        setReclamationToDelete(undefined);
    };

    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setReclamationToDelete(undefined);
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

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Réclamations</h1>
                    <p className="text-muted-foreground">
                        Gérez les réclamations des clients sur la plateforme
                    </p>
                </div>
            </div>

            {/* ========== STATISTIQUES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total des réclamations
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.en_attente} en attente
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {stats.en_cours} en cours
                            </Badge>
                        </div>
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
                            À traiter en priorité
                        </p>
                    </CardContent>
                </Card>

                {/* En cours */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                            En cours
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-600">
                            {stats.en_cours}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            En cours de traitement
                        </p>
                    </CardContent>
                </Card>

                {/* Résolues */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Résolues
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">
                            {stats.remboursees + stats.rejetees}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                {stats.remboursees} remboursées
                            </Badge>
                            <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                {stats.rejetees} rejetées
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ========== ALERTE RÉCLAMATIONS EN ATTENTE ========== */}
            {stats.en_attente > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">{stats.en_attente} réclamation{stats.en_attente > 1 ? 's' : ''}</span>{" "}
                        {stats.en_attente > 1 ? 'sont' : 'est'} en attente de traitement.
                    </p>
                </div>
            )}

            {/* ========== TABLEAU DES RÉCLAMATIONS ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les réclamations</CardTitle>
                    <CardDescription>
                        Consultez et gérez toutes les réclamations soumises par les clients
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReclamationsTable
                        reclamations={reclamations}
                        isLoading={isLoading}
                        onView={handleView}
                        onDelete={handleDelete}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE VISUALISATION ========== */}
            <ReclamationViewModal
                open={isViewModalOpen}
                onClose={handleCloseViewModal}
                reclamation={selectedReclamation}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La réclamation de{" "}
                            <span className="font-semibold">
                                {reclamationToDelete?.users?.name ?? 'ce client'}
                            </span>{" "}
                            sera définitivement supprimée de la base de données.
                            <br /><br />
                            <span className="text-orange-600 font-medium">
                                ⚠️ Cette action ne peut pas être annulée.
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
