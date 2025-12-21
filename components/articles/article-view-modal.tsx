// components/articles/article-view-modal.tsx
'use client';

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    Package, 
    Tag, 
    MapPin, 
    Store, 
    Calendar,
    DollarSign,
    Image as ImageIcon,
    Layers
} from "lucide-react";
import { type Article } from '@/stores/articlesStore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

// ============================================
// PROPS
// ============================================

interface ArticleViewModalProps {
    open: boolean;
    onClose: () => void;
    article?: Article;
}

// ============================================
// HELPERS
// ============================================

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

/**
 * Formate une date
 */
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Calcule le stock total
 */
const getTotalStock = (article: Article) => {
    return article.variations?.reduce((sum, v) => sum + v.stock, 0) || 0;
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function ArticleViewModal({
    open,
    onClose,
    article,
}: ArticleViewModalProps) {
    if (!article) return null;

    const totalStock = getTotalStock(article);
    const prixAffichage = article.is_promotion && article.prix_promotion 
        ? article.prix_promotion 
        : article.prix;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Détails de l'article</DialogTitle>
                    <DialogDescription>
                        Visualisez toutes les informations de cet article
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Image principale et informations de base */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image principale */}
                        <div className="space-y-4">
                            <Avatar className="h-64 w-full rounded-lg">
                                <AvatarImage
                                    src={article.image_principale || undefined}
                                    alt={article.nom}
                                    className="object-cover"
                                />
                                <AvatarFallback className="rounded-lg text-4xl">
                                    {article.nom.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            {/* Galerie d'images supplémentaires */}
                            {article.image_articles && article.image_articles.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <ImageIcon className="h-4 w-4" />
                                        Images supplémentaires ({article.image_articles.length})
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {article.image_articles.slice(0, 4).map((img) => (
                                            <Avatar key={img.id} className="h-16 w-16 rounded-md">
                                                <AvatarImage
                                                    src={img.url_photo}
                                                    alt="Image article"
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="rounded-md">
                                                    <ImageIcon className="h-6 w-6" />
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Informations principales */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold">{article.nom}</h3>
                                {article.description && (
                                    <p className="text-muted-foreground mt-2">
                                        {article.description}
                                    </p>
                                )}
                            </div>

                            <Separator />

                            {/* Prix */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <DollarSign className="h-4 w-4" />
                                    Prix
                                </div>
                                {article.is_promotion && article.prix_promotion ? (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl font-bold text-green-600">
                                                {formatMontant(article.prix_promotion)}
                                            </span>
                                            <Badge variant="destructive">
                                                -{article.pourcentage_reduction}%
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground line-through">
                                            Prix initial : {formatMontant(article.prix)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-3xl font-bold">
                                        {formatMontant(article.prix)}
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Stock */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                    Stock disponible
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${
                                        totalStock === 0 
                                            ? 'text-red-600' 
                                            : totalStock < 10 
                                            ? 'text-orange-600' 
                                            : 'text-green-600'
                                    }`}>
                                        {totalStock}
                                    </span>
                                    <span className="text-muted-foreground">unités</span>
                                </div>
                            </div>

                            <Separator />

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                {article.is_active ? (
                                    <Badge variant="default">
                                        Actif
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        Inactif
                                    </Badge>
                                )}

                                {article.is_promotion && (
                                    <Badge variant="default" className="bg-green-600">
                                        <Tag className="mr-1 h-3 w-3" />
                                        En promotion
                                    </Badge>
                                )}

                                {article.made_in_gabon && (
                                    <Badge variant="secondary">
                                        <MapPin className="mr-1 h-3 w-3" />
                                        Made in Gabon
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Informations supplémentaires */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Catégorie */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Layers className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Catégorie</p>
                                        <p className="font-medium">
                                            {article.categories?.nom || "Non classé"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vendeur */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Store className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Vendeur</p>
                                        <p className="font-medium">
                                            {article.users?.name || "Non défini"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Variations */}
                    {article.variations && article.variations.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                <h4 className="text-lg font-semibold">
                                    Variations ({article.variations.length})
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {article.variations.map((variation) => (
                                    <Card key={variation.id}>
                                        <CardContent className="pt-6">
                                            <div className="space-y-3">
                                                {variation.image && (
                                                    <Avatar className="h-20 w-20 rounded-md">
                                                        <AvatarImage
                                                            src={variation.image}
                                                            alt="Variation"
                                                            className="object-cover"
                                                        />
                                                        <AvatarFallback className="rounded-md">
                                                            <ImageIcon className="h-8 w-8" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div className="space-y-2">
                                                    {variation.couleur && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                Couleur:
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {variation.couleur}
                                                            </Badge>
                                                        </div>
                                                    )}

                                                    {variation.taille && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                Taille:
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {variation.taille}
                                                            </Badge>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            Stock:
                                                        </span>
                                                        <Badge variant="secondary" className="text-xs">
                                                            {variation.stock} unités
                                                        </Badge>
                                                    </div>

                                                    {variation.prix && (
                                                        <div className="text-sm font-bold text-primary">
                                                            {formatMontant(variation.prix)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Métadonnées */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Créé le : {formatDate(article.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Modifié le : {formatDate(article.updated_at)}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}