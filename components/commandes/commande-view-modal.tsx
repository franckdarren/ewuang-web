// components/commandes/commande-view-modal.tsx
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    Truck,
    PackageCheck,
    Package,
    User,
    MapPin,
    Phone,
    ShoppingBag,
    Calendar,
    CreditCard,
} from "lucide-react";
import { type Commande } from "@/stores/types/common";

// ============================================
// PROPS
// ============================================

interface CommandeViewModalProps {
    open: boolean;
    onClose: () => void;
    commande?: Commande;
}

// ============================================
// HELPERS
// ============================================

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

const formatMontant = (montant: number) =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        maximumFractionDigits: 0,
    }).format(montant);

const getStatutConfig = (statut: string) => {
    const s = statut?.toLowerCase() ?? '';

    if (s.includes('attente')) {
        return {
            label: 'En attente',
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            badgeClass: 'text-amber-600 border-amber-300 bg-amber-50',
        };
    }
    if (s.includes('préparation') || s.includes('preparation')) {
        return {
            label: 'En préparation',
            icon: Package,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            badgeClass: 'text-blue-600 border-blue-300 bg-blue-50',
        };
    }
    if (s.includes('prête') || s.includes('prete')) {
        return {
            label: 'Prête pour livraison',
            icon: PackageCheck,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            badgeClass: 'text-purple-600 border-purple-300 bg-purple-50',
        };
    }
    if (s.includes('cours')) {
        return {
            label: 'En cours de livraison',
            icon: Truck,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200',
            badgeClass: 'text-indigo-600 border-indigo-300 bg-indigo-50',
        };
    }
    if (s.includes('livr') && !s.includes('livraison')) {
        return {
            label: 'Livrée',
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            badgeClass: 'text-green-600 border-green-300 bg-green-50',
        };
    }
    if (s.includes('annul')) {
        return {
            label: 'Annulée',
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            badgeClass: 'text-red-600 border-red-300 bg-red-50',
        };
    }
    if (s.includes('rembours')) {
        return {
            label: 'Remboursée',
            icon: RefreshCw,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            borderColor: 'border-teal-200',
            badgeClass: 'text-teal-600 border-teal-300 bg-teal-50',
        };
    }
    return {
        label: statut ?? '—',
        icon: Clock,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        borderColor: 'border-border',
        badgeClass: '',
    };
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function CommandeViewModal({ open, onClose, commande }: CommandeViewModalProps) {
    if (!commande) return null;

    const statutConfig = getStatutConfig(commande.statut as string);
    const StatusIcon = statutConfig.icon;

    // L'API retourne users (acheteur) et commande_articles
    const user = (commande as any).users;
    const articles = (commande as any).commande_articles ?? [];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6" />
                        Commande #{commande.numero}
                    </DialogTitle>
                    <DialogDescription>
                        Détails complets de la commande
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Bandeau statut */}
                    <Card className={`${statutConfig.bgColor} border ${statutConfig.borderColor}`}>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <StatusIcon className={`h-6 w-6 ${statutConfig.color}`} />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Statut actuel</p>
                                        <p className={`text-lg font-semibold ${statutConfig.color}`}>
                                            {statutConfig.label}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Montant total</p>
                                    <p className="text-2xl font-bold">{formatMontant(commande.prix)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Informations client */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Client
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Nom</p>
                                    <p className="font-medium">{user?.name ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="font-medium">{user?.email ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Téléphone</p>
                                    <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <p className="font-medium font-mono">{user?.phone ?? '—'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Livraison */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Livraison
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Type</p>
                                    <Badge variant={commande.isLivrable ? "default" : "secondary"}>
                                        {commande.isLivrable ? "À domicile" : "Retrait en boutique"}
                                    </Badge>
                                </div>
                                {commande.isLivrable && commande.adresse_livraison && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Adresse</p>
                                        <div className="flex items-start gap-1">
                                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                                            <p className="font-medium text-sm">{commande.adresse_livraison}</p>
                                        </div>
                                    </div>
                                )}
                                {commande.commentaire && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Commentaire</p>
                                        <p className="text-sm text-muted-foreground italic">
                                            "{commande.commentaire}"
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Articles de la commande */}
                    {articles.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Articles ({articles.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {articles.map((ca: any, index: number) => {
                                        const article = ca.articles ?? ca.article;
                                        const variation = ca.variations ?? ca.variation;
                                        return (
                                            <div
                                                key={ca.id ?? index}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                            >
                                                {/* Image article */}
                                                <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                                    {article?.image_principale ? (
                                                        <img
                                                            src={article.image_principale}
                                                            alt={article.nom}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center">
                                                            <Package className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Infos article */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {article?.nom ?? 'Article inconnu'}
                                                    </p>
                                                    {variation && (
                                                        <div className="flex gap-2 mt-0.5">
                                                            {variation.couleur && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Couleur : {variation.couleur}
                                                                </span>
                                                            )}
                                                            {variation.taille && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Taille : {variation.taille}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Quantité et prix */}
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs text-muted-foreground">
                                                        x{ca.quantite}
                                                    </p>
                                                    <p className="font-semibold text-sm">
                                                        {formatMontant(ca.prix_unitaire * ca.quantite)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatMontant(ca.prix_unitaire)} / u.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Total */}
                                    <Separator />
                                    <div className="flex items-center justify-between pt-1">
                                        <p className="font-semibold">Total commande</p>
                                        <p className="text-xl font-bold">{formatMontant(commande.prix)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Métadonnées */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Créée le</p>
                                        <p className="font-medium text-sm">{formatDate(commande.created_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Dernière mise à jour</p>
                                        <p className="font-medium text-sm">{formatDate(commande.updated_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Identifiant paiement */}
                    {commande.paiement_id && (
                        <Card>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Référence paiement</p>
                                        <p className="font-mono text-sm">{commande.paiement_id}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
