// app/dashboard/articles/page.tsx
'use client';

import React from 'react';
import { useArticlesStore, type Article } from '@/stores/articlesStore';
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
    Package,
    TrendingUp,
    Star,
    MapPin,
    DollarSign,
    ShoppingCart
} from "lucide-react";
import { toast } from "sonner";
import { ArticlesTable } from "../../../components/articles/articles-table";
import { ArticleFormModal } from "../../../components/articles/article-form-modal";
import { ArticleViewModal } from "../../../components/articles/article-view-modal";

// ============================================
// TYPES
// ============================================

interface ArticleFormValues {
    nom: string;
    description?: string | null;
    prix: number;
    prix_promotion?: number | null;
    is_promotion?: boolean;
    pourcentage_reduction?: number;
    made_in_gabon?: boolean;
    user_id?: string;
    categorie_id?: string | null;
    image_principale?: string | null;
    is_active?: boolean;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ArticlePage() {
    // ========== STORE ==========
    const {
        articles,
        isLoading,
        stats,
        fetchArticles,
        deleteArticle,
        toggleArticleActive,
        toggleArticlePromotion,
    } = useArticlesStore();

    // ========== STATE LOCAL ==========
    const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
    const [selectedArticle, setSelectedArticle] = React.useState<Article | undefined>(undefined);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [articleToDelete, setArticleToDelete] = React.useState<Article | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // ========== EFFECTS ==========

    /**
     * Charge les articles au montage du composant
     */
    React.useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    // ========== HANDLERS ==========

    /**
     * Ouvre le modal de formulaire pour créer un article
     */
    const handleCreate = () => {
        setSelectedArticle(undefined);
        setIsFormModalOpen(true);
    };

    /**
     * Ouvre le modal de visualisation d'un article
     */
    const handleView = (article: Article) => {
        setSelectedArticle(article);
        setIsViewModalOpen(true);
    };

    /**
     * Ouvre le modal de formulaire pour modifier un article
     */
    const handleEdit = (article: Article) => {
        setSelectedArticle(article);
        setIsFormModalOpen(true);
    };

    /**
     * Ferme le modal de formulaire
     */
    const handleCloseFormModal = () => {
        setIsFormModalOpen(false);
        setSelectedArticle(undefined);
    };

    /**
     * Ferme le modal de visualisation
     */
    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedArticle(undefined);
    };

    /**
     * Ouvre le dialog de confirmation de suppression
     */
    const handleDelete = (article: Article) => {
        setArticleToDelete(article);
        setIsDeleteDialogOpen(true);
    };

    /**
     * Confirme et exécute la suppression d'un article
     */
    const handleConfirmDelete = async () => {
        if (!articleToDelete) return;

        const success = await deleteArticle(articleToDelete.id);

        if (success) {
            setIsDeleteDialogOpen(false);
            setArticleToDelete(undefined);
        }
    };

    /**
     * Annule la suppression
     */
    const handleCancelDelete = () => {
        setIsDeleteDialogOpen(false);
        setArticleToDelete(undefined);
    };

    /**
     * Active ou désactive un article
     */
    const handleToggleActive = async (article: Article) => {
        const newStatus = !article.is_active;
        await toggleArticleActive(article.id, newStatus);
    };

    /**
     * Met en promotion ou retire de la promotion
     */
    const handleTogglePromotion = async (article: Article) => {
        const newStatus = !article.is_promotion;

        if (newStatus && !article.prix_promotion) {
            toast.info("Définir le prix promotionnel", {
                description: "Veuillez d'abord modifier l'article pour définir un prix promotionnel",
            });
            return;
        }

        await toggleArticlePromotion(
            article.id,
            newStatus,
            article.prix_promotion || undefined,
            article.pourcentage_reduction || undefined
        );
    };

    /**
     * Formate un montant en FCFA
     */
    const formatMontant = (montant: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0,
        }).format(montant);
    };

    // ========== RENDER ==========

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* ========== EN-TÊTE ========== */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
                    <p className="text-muted-foreground">
                        Gérez tous les articles de la plateforme
                    </p>
                </div>
                {/* <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un article
                </Button> */}
            </div>

            {/* ========== STATISTIQUES ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total des articles */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Total des articles
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                                {stats.actifs} actifs
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {stats.inactifs} inactifs
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Articles en promotion */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            En promotion
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.en_promotion}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Articles avec réduction
                        </p>
                    </CardContent>
                </Card>

                {/* Made in Gabon */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Made in Gabon
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.made_in_gabon}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Produits locaux
                        </p>
                    </CardContent>
                </Card>

                {/* Stock total */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Stock total
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {stats.total_stock}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Unités disponibles
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========== STATISTIQUES FINANCIÈRES ========== */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Valeur totale du stock */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Valeur totale du stock
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold text-green-600">
                            {formatMontant(stats.valeur_totale)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Basé sur les prix actuels et le stock disponible
                        </p>
                    </CardContent>
                </Card>

                {/* Prix moyen */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Prix moyen
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold">
                            {formatMontant(stats.moyenne_prix)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">
                            Moyenne de tous les articles
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========== TABLEAU DES ARTICLES ========== */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des articles</CardTitle>
                    <CardDescription>
                        Consultez et gérez tous les articles de la plateforme
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ArticlesTable
                        articles={articles}
                        isLoading={isLoading}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleActive={handleToggleActive}
                        onTogglePromotion={handleTogglePromotion}
                    />
                </CardContent>
            </Card>

            {/* ========== MODAL DE FORMULAIRE ========== */}
            <ArticleFormModal
                open={isFormModalOpen}
                onClose={handleCloseFormModal}
                article={selectedArticle}
                isLoading={isSubmitting}
            />

            {/* ========== MODAL DE VISUALISATION ========== */}
            <ArticleViewModal
                open={isViewModalOpen}
                onClose={handleCloseViewModal}
                article={selectedArticle}
            />

            {/* ========== DIALOG DE CONFIRMATION DE SUPPRESSION ========== */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. L'article{" "}
                            <span className="font-semibold">{articleToDelete?.nom}</span> sera
                            définitivement supprimé de la base de données.
                            <br /><br />
                            <span className="text-red-600 font-medium">
                                ⚠️ Toutes les variations, images et données associées seront également supprimées.
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