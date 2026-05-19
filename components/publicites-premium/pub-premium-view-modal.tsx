'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, MapPin, Building2, Tag } from 'lucide-react';
import type { PublicitePremium, PublitePosition, PublitePremiumStatut } from '@/stores/publicitesPremiumStore';

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
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface PubPremiumViewModalProps {
    open: boolean;
    onClose: () => void;
    pub: PublicitePremium | undefined;
}

export function PubPremiumViewModal({ open, onClose, pub }: PubPremiumViewModalProps) {
    if (!pub) return null;

    const cfg = STATUT_CONFIG[pub.statut];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {pub.titre}
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden border bg-muted max-h-64">
                        <img
                            src={pub.url_image}
                            alt={pub.titre}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium text-foreground">
                                {pub.boutique?.name ?? 'Boutique inconnue'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{POSITION_LABELS[pub.position]}</span>
                            {pub.categorie && (
                                <span className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {pub.categorie.nom}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(pub.date_start)} → {formatDate(pub.date_end)}</span>
                        </div>

                        {pub.prix != null && (
                            <div className="text-muted-foreground">
                                Prix : <span className="font-medium text-foreground">{pub.prix.toLocaleString('fr-FR')} XAF</span>
                            </div>
                        )}

                        {pub.lien && (
                            <div className="col-span-2">
                                <a
                                    href={pub.lien}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {pub.lien}
                                </a>
                            </div>
                        )}
                    </div>

                    {pub.description && (
                        <p className="text-sm text-muted-foreground border-t pt-3">{pub.description}</p>
                    )}

                    {pub.statut === 'refuse' && pub.notes_admin && (
                        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            <p className="font-medium mb-1">Motif de refus :</p>
                            <p>{pub.notes_admin}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
