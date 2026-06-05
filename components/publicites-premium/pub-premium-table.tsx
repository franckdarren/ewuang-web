'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PAGE_SIZE = 10;
import { CheckCircle, XCircle, Eye, Ban, Clock, Pencil, Trash2 } from 'lucide-react';
import type { PublicitePremium, PublitePosition, PublitePremiumStatut } from '@/stores/publicitesPremiumStore';
import { proxiedMediaUrl } from '@/lib/mediaUrl';

// ============================================
// HELPERS
// ============================================

const POSITION_LABELS: Record<PublitePosition, string> = {
    banniere_accueil: 'Bannière accueil',
    banniere_categorie: 'Bannière catégorie',
    banniere_boutique: 'Bannière boutique',
};

const STATUT_CONFIG: Record<PublitePremiumStatut, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    en_attente: { label: 'En attente', variant: 'secondary' },
    approuve: { label: 'Approuvée', variant: 'default' },
    refuse: { label: 'Refusée', variant: 'destructive' },
    annule: { label: 'Annulée', variant: 'outline' },
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isActifMaintenant(pub: PublicitePremium): boolean {
    const now = new Date();
    return pub.statut === 'approuve' && new Date(pub.date_start) <= now && new Date(pub.date_end) >= now;
}

// ============================================
// PROPS
// ============================================

interface PubPremiumTableProps {
    publicites: PublicitePremium[];
    isLoading: boolean;
    onView: (pub: PublicitePremium) => void;
    onApprouver: (pub: PublicitePremium) => void;
    onRefuser: (pub: PublicitePremium) => void;
    onAnnuler?: (pub: PublicitePremium) => void;
    onEdit?: (pub: PublicitePremium) => void;
    onDelete?: (pub: PublicitePremium) => void;
    showActions?: boolean;
}

// ============================================
// COMPOSANT
// ============================================

export function PubPremiumTable({
    publicites,
    isLoading,
    onView,
    onApprouver,
    onRefuser,
    onAnnuler,
    onEdit,
    onDelete,
    showActions = true,
}: PubPremiumTableProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(publicites.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = publicites.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                Chargement…
            </div>
        );
    }

    if (publicites.length === 0) {
        return (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
                Aucune publicité premium trouvée
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Visuel</TableHead>
                        <TableHead>Titre</TableHead>
                        <TableHead>Boutique</TableHead>
                        <TableHead>Emplacement</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Prix (XAF)</TableHead>
                        <TableHead>Statut</TableHead>
                        {showActions && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginated.map((pub) => {
                        const cfg = STATUT_CONFIG[pub.statut];
                        const actif = isActifMaintenant(pub);
                        return (
                            <TableRow key={pub.id}>
                                <TableCell>
                                    <div className="h-12 w-20 overflow-hidden rounded border bg-muted">
                                        <img
                                            src={proxiedMediaUrl(pub.url_image)}
                                            alt={pub.titre}
                                            className="h-full w-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium max-w-[160px] truncate">{pub.titre}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {pub.boutique?.name ?? pub.boutique_id.slice(0, 8) + '…'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                        {POSITION_LABELS[pub.position]}
                                    </Badge>
                                    {pub.categorie && (
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            – {pub.categorie.nom}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDate(pub.date_start)} → {formatDate(pub.date_end)}
                                    {actif && (
                                        <span className="ml-1 text-green-600 font-medium">• En cours</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {pub.prix != null ? pub.prix.toLocaleString('fr-FR') : '—'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                </TableCell>
                                {showActions && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" title="Voir" onClick={() => onView(pub)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {onEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Modifier"
                                                    className="text-blue-600 hover:text-blue-700"
                                                    onClick={() => onEdit(pub)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {pub.statut === 'en_attente' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Approuver"
                                                        className="text-green-600 hover:text-green-700"
                                                        onClick={() => onApprouver(pub)}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Refuser"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => onRefuser(pub)}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                    {onAnnuler && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Annuler"
                                                            className="text-orange-500 hover:text-orange-600"
                                                            onClick={() => onAnnuler(pub)}
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}

                                            {pub.statut === 'approuve' && !actif && (
                                                <span title="Programmée">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                </span>
                                            )}

                                            {onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Supprimer"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => onDelete(pub)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-end">
                <div className="text-muted-foreground text-sm sm:flex-1">
                    {publicites.length} résultat{publicites.length !== 1 ? 's' : ''} — page {safePage} sur {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                    >
                        Précédent
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                    >
                        Suivant
                    </Button>
                </div>
            </div>
        </div>
    );
}
