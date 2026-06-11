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
import { Skeleton } from "@/components/ui/skeleton";
import { ArticlesTable } from "../../../components/articles/articles-table";
import { ArticleFormModal } from "../../../components/articles/article-form-modal";
import { ArticleViewModal } from "../../../components/articles/article-view-modal";
import { StatFilterCard } from "@/components/stat-filter-card";

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
    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    const [articleFilter, setArticleFilter] = React.useState<'all' | 'promotion' | 'gabon' | 'rupture'>('all');

    const toggleArticleFilter = (key: string) => {
        setArticleFilter((prev) => (prev === key ? 'all' : (key as typeof articleFilter)));
    };

    const filteredArticles = React.useMemo(() => {
        switch (articleFilter) {
            case 'promotion':
                return articles.filter((a) => a.is_promotion);
            case 'gabon':
                return articles.filter((a) => a.made_in_gabon);
            case 'rupture':
                return articles.filter((a) => (a.stock ?? 0) === 0);
            default:
                return articles;
        }
    }, [articles, articleFilter]);

    const filterTitles: Record<typeof articleFilter, string> = {
        all: 'Liste des articles',
        promotion: 'Articles en promotion',
        gabon: 'Articles Made in Gabon',
        rupture: 'Articles en rupture de stock',
    };

    // ========== EFFECTS ==========

    /**
     * Charge les articles au montage du composant
     */
    React.useEffect(() => {
        fetchArticles().finally(() => setIsInitialLoading(false));
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

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                {/* Skeleton en-tête */}
                <div className="space-y-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-4 w-72" />
                </div>

                {/* Skeleton stats x4 */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-9 w-16 mt-1" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-28" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Skeleton stats financières x2 */}
                <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-8 w-32 mt-1" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-56" />
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

            {/* ========== STATISTIQUES CLIQUABLES (filtres) ========== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatFilterCard
                    filterKey="all"
                    activeFilter={articleFilter}
                    onSelect={(key) => setArticleFilter(key as typeof articleFilter)}
                    label={<><Package className="h-4 w-4" /> Total des articles</>}
                    value={stats.total}
                    footer={
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{stats.actifs} actifs</Badge>
                            <Badge variant="outline" className="text-xs">{stats.inactifs} inactifs</Badge>
                        </div>
                    }
                />
                <StatFilterCard
                    filterKey="promotion"
                    activeFilter={articleFilter}
                    onSelect={toggleArticleFilter}
                    label={<><TrendingUp className="h-4 w-4 text-orange-600" /> En promotion</>}
                    value={stats.en_promotion}
                    valueClassName="text-orange-600"
                    activeRingClassName="ring-orange-500/40 border-orange-500/50 bg-orange-50/50"
                    footer={<p className="text-xs text-muted-foreground">Articles avec réduction</p>}
                />
                <StatFilterCard
                    filterKey="gabon"
                    activeFilter={articleFilter}
                    onSelect={toggleArticleFilter}
                    label={<><MapPin className="h-4 w-4 text-emerald-600" /> Made in Gabon</>}
                    value={stats.made_in_gabon}
                    valueClassName="text-emerald-600"
                    activeRingClassName="ring-emerald-500/40 border-emerald-500/50 bg-emerald-50/50"
                    footer={<p className="text-xs text-muted-foreground">Produits locaux</p>}
                />
                <StatFilterCard
                    filterKey="rupture"
                    activeFilter={articleFilter}
                    onSelect={toggleArticleFilter}
                    label={<><ShoppingCart className="h-4 w-4 text-red-600" /> Stock total</>}
                    value={stats.total_stock}
                    activeRingClassName="ring-red-500/40 border-red-500/50 bg-red-50/50"
                    footer={<p className="text-xs text-muted-foreground">Cliquez pour voir les ruptures</p>}
                />
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>{filterTitles[articleFilter]}</CardTitle>
                            <CardDescription>
                                {articleFilter === 'all'
                                    ? 'Consultez et gérez tous les articles de la plateforme'
                                    : `${filteredArticles.length} article${filteredArticles.length > 1 ? 's' : ''} sur ${articles.length}`}
                            </CardDescription>
                        </div>
                        {articleFilter !== 'all' && (
                            <Button variant="ghost" size="sm" onClick={() => setArticleFilter('all')}>
                                Réinitialiser le filtre
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <ArticlesTable
                        articles={filteredArticles}
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