// app/dashboard/publicites/page.tsx
'use client';

import React from 'react';
import { usePublicitesStore, type Publicite } from '@/stores/publicitesStore';
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
    Plus,
    TrendingUp,
    Calendar,
    Eye,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle
} from "lucide-react";
import { PublicitesTable } from "@/components/publicites/publicites-table";
import { PubliciteFormModal } from "../../../components/publicites/publicite-form-modal";
import { PubliciteViewModal } from "../../../components/publicites/publicite-view-modal";

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function PublicitesPage() {
    // ========== STORE ==========
    const {
        publicites,
        isLoading,
        stats,
        fetchPublicites,
        deletePublicite,
        togglePubliciteActive,
    } = usePublicitesStore();

    // ========== STATE LOCAL ==========
    const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [selectedPublicite, setSelectedPublicite] = React.useState<Publicite | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [publiciteToDelete, setPubliciteToDelete] = React.useState<Publicite | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // ========== EFFECTS ==========

    /**
     * Charge les publicités au montage du composant
     */
    React.useEffect(() => {
        fetchPublicites();
    }, [fetchPublicites]);

    // ========== HANDLERS ==========

    /**
     * Ouvre le modal de formulaire pour créer une publicité
     */
    const handleCreate = () => {
        setSelectedPublicite(undefined);
        setIsFormModalOpen(true);
    };

    /**
     * Ouvre le modal de visualisation d'une publicité
     */
    const handleView = (publicite: Publicite) => {
        setSelectedPublicite(publicite);
        setIsViewModalOpen(true);
    };

    /**
     * Ouvre le modal de formulaire pour modifier une publicité
     */
    const handleEdit = (publicite: Publicite) => {
        setSelectedPublicite(publicite);
        setIsFormModalOpen(true);
    };

    /**
     * Ferme le modal de formulaire
     */
    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setSelectedPublicite(undefined);
    };

    /**
     * Ferme le modal de visualisation
     */
    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedPublicite(undefined);
    };

    /**
     * Ouvre le dialog de confirmation de suppression
     */
    const handleDelete = (publicite: Publicite) => {
        setPubliciteToDelete(publicite);
        setIsDeleteDialogOpen(true);
    };

    /**
     * Confirme et exécute la suppression d'une publicité
     */
    const handleConfirmDelete = async () => {
        if (!publiciteToDelete) return;

        await deletePublicite(publiciteToDelete.id);

        setIsDeleteDialogOpen(false);
        setPubliciteToDelete(undefined);
    };

    /**
     * Annule la suppression
     */
    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setPubliciteToDelete(undefined);
    };

    /**
     * Active ou désactive une publicité
     */
    const handleToggleActive = async (publicite: Publicite) => {
        const newStatus = !publicite.is_actif;
        await togglePubliciteActive(publicite.id, newStatus);
    };

    /**
     * Formate une date
     */
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // ========== RENDER ==========

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Publicités</h1>
                    <p className="text-muted-foreground">
                        Gérez vos campagnes publicitaires sur la plateforme
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle campagne
                </Button>
            </div>

            {/* ========== STATISTIQUES PRINCIPALES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total des publicités */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total des campagnes
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.actives} actives
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {stats.inactives} inactives
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Publicités en cours */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            En cours
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">
                            {stats.en_cours}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Diffusées actuellement
                        </p>
                    </CardContent>
                </Card>

                {/* Publicités à venir */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            À venir
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-600">
                            {stats.a_venir}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Programmées prochainement
                        </p>
                    </CardContent>
                </Card>

                {/* Publicités expirées */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            Expirées
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-orange-600">
                            {stats.expirees}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Terminées ou passées
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========== APERÇU DES CAMPAGNES ACTIVES ========== */}
            {stats.en_cours > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Campagnes en cours</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {publicites
                            .filter(pub => {
                                const now = new Date();
                                const start = new Date(pub.date_start);
                                const end = new Date(pub.date_end);
                                return now >= start && now <= end && pub.is_actif;
                            })
                            .slice(0, 3)
                            .map((publicite) => (
                                <Card key={publicite.id} className="overflow-hidden">
                                    <div className="relative h-40 w-full bg-muted">
                                        <img
                                            src={publicite.url_image}
                                            alt={publicite.titre}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Image+non+disponible';
                                            }}
                                        />
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="default" className="bg-green-600">
                                                <Eye className="mr-1 h-3 w-3" />
                                                En cours
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardHeader>
                                        <CardTitle className="line-clamp-1">{publicite.titre}</CardTitle>
                                        <CardDescription className="line-clamp-2">
                                            {publicite.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>Jusqu'au {formatDate(publicite.date_end)}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleView(publicite)}
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

            {/* ========== TABLEAU DES PUBLICITÉS ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Toutes les campagnes</CardTitle>
                    <CardDescription>
                        Consultez et gérez toutes vos campagnes publicitaires
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PublicitesTable
                        publicites={publicites}
                        isLoading={isLoading}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleActive={handleToggleActive}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE FORMULAIRE ========== */}
            <PubliciteFormModal
                open={isFormModalOpen}
                onClose={handleCloseFormModal}
                publicite={selectedPublicite}
                isLoading={isSubmitting}
            />

            {/* ========== MODAL DE VISUALISATION ========== */}
            <PubliciteViewModal
                open={isViewModalOpen}
                onClose={handleCloseViewModal}
                publicite={selectedPublicite}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La campagne{" "}
                            <span className="font-semibold">{publiciteToDelete?.titre}</span> sera
                            définitivement supprimée de la base de données.
                            <br /><br />
                            <span className="text-orange-600 font-medium">
                                ⚠️ La publicité ne sera plus diffusée sur la plateforme.
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