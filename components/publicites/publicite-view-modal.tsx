// components/publicites/publicite-view-modal.tsx
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
    Calendar,
    ExternalLink,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Play,
    Image as ImageIcon,
} from "lucide-react";
import { type Publicite } from '@/stores/publicitesStore';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ============================================
// PROPS
// ============================================

interface PubliciteViewModalProps {
    open: boolean;
    onClose: () => void;
    publicite?: Publicite;
}

// ============================================
// HELPERS
// ============================================

/**
 * Formate une date complète
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
 * Formate une date courte
 */
const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Calcule la durée en jours
 */
const getDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Calcule les jours restants
 */
const getDaysRemaining = (endDate: string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Retourne le statut de la publicité
 */
const getPubliciteStatus = (publicite: Publicite) => {
    const now = new Date();
    const start = new Date(publicite.date_start);
    const end = new Date(publicite.date_end);

    if (!publicite.is_actif) {
        return {
            label: 'Inactive',
            variant: 'secondary' as const,
            icon: XCircle,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
        };
    }

    if (now < start) {
        const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            label: 'À venir',
            variant: 'outline' as const,
            icon: Clock,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            details: `Démarre dans ${daysUntilStart} jour${daysUntilStart > 1 ? 's' : ''}`,
        };
    }

    if (now >= start && now <= end) {
        const daysRemaining = getDaysRemaining(publicite.date_end);
        return {
            label: 'En cours',
            variant: 'default' as const,
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            details: daysRemaining > 0
                ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
                : 'Dernier jour',
        };
    }

    return {
        label: 'Expirée',
        variant: 'destructive' as const,
        icon: AlertCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        details: 'Campagne terminée',
    };
};

/**
 * Détecte le type de média
 */
const getMediaType = (url: string): 'image' | 'video' | 'gif' => {
    const lower = url.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
        return 'video';
    }
    if (lower.endsWith('.gif')) {
        return 'gif';
    }
    return 'image';
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function PubliciteViewModal({
    open,
    onClose,
    publicite,
}: PubliciteViewModalProps) {
    const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    if (!publicite) return null;

    const status = getPubliciteStatus(publicite);
    const mediaType = getMediaType(publicite.url_image);
    const duration = getDuration(publicite.date_start, publicite.date_end);
    const StatusIcon = status.icon;

    const handlePlayVideo = () => {
        if (videoRef.current) {
            if (isVideoPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsVideoPlaying(!isVideoPlaying);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Détails de la campagne</DialogTitle>
                    <DialogDescription>
                        Visualisez toutes les informations de cette campagne publicitaire
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Statut en haut */}
                    <Card className={status.bgColor}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <StatusIcon className={`h-6 w-6 ${status.color}`} />
                                    <div>
                                        <h3 className={`text-lg font-semibold ${status.color}`}>
                                            {status.label}
                                        </h3>
                                        {status.details && (
                                            <p className="text-sm text-muted-foreground">
                                                {status.details}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Badge variant={status.variant} className="text-sm">
                                    {publicite.is_actif ? 'Activée' : 'Désactivée'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Média principal */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    {mediaType === 'video' && (
                                        <>
                                            <Play className="h-4 w-4" />
                                            Vidéo publicitaire
                                        </>
                                    )}
                                    {mediaType === 'gif' && (
                                        <>
                                            <ImageIcon className="h-4 w-4" />
                                            GIF animé
                                        </>
                                    )}
                                    {mediaType === 'image' && (
                                        <>
                                            <ImageIcon className="h-4 w-4" />
                                            Image publicitaire
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                                {mediaType === 'video' ? (
                                    <div className="relative w-full h-full">
                                        <video
                                            ref={videoRef}
                                            src={publicite.url_image}
                                            className="w-full h-full object-contain"
                                            controls
                                            loop
                                            onPlay={() => setIsVideoPlaying(true)}
                                            onPause={() => setIsVideoPlaying(false)}
                                        />
                                    </div>
                                ) : (
                                    <img
                                        src={publicite.url_image}
                                        alt={publicite.titre}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = 'https://via.placeholder.com/800x450?text=Media+non+disponible';
                                        }}
                                    />
                                )}
                            </div>

                            {/* Lien externe */}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => window.open(publicite.lien, '_blank')}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ouvrir le lien de destination
                            </Button>
                        </div>

                        {/* Informations détaillées */}
                        <div className="space-y-6">
                            {/* Titre et description */}
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-2xl font-bold">{publicite.titre}</h3>
                                </div>
                                <p className="text-muted-foreground">
                                    {publicite.description}
                                </p>
                            </div>

                            <Separator />

                            {/* Période de diffusion */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg">Période de diffusion</h4>

                                <div className="grid gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-3">
                                                <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Date de début
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        {formatDateShort(publicite.date_start)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDate(publicite.date_start)}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-3">
                                                <Calendar className="h-5 w-5 text-red-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        Date de fin
                                                    </p>
                                                    <p className="text-lg font-semibold">
                                                        {formatDateShort(publicite.date_end)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDate(publicite.date_end)}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-muted/50">
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">
                                                    Durée totale de la campagne
                                                </p>
                                                <p className="text-3xl font-bold text-primary mt-2">
                                                    {duration} jour{duration > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <Separator />

                            {/* Informations supplémentaires */}
                            <div className="space-y-3">
                                <h4 className="font-semibold">Lien de destination</h4>
                                <div className="flex items-center gap-2 text-sm">
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    <a
                                        href={publicite.lien}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline break-all"
                                    >
                                        {publicite.lien}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Métadonnées */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Créée le</p>
                                        <p className="font-medium">{formatDate(publicite.created_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Modifiée le</p>
                                        <p className="font-medium">{formatDate(publicite.updated_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}