'use client';

import React from 'react';
import { usePublitesPremiumStore, type PublicitePremium } from '@/stores/publicitesPremiumStore';
import { useIsAdmin } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Clock,
    CheckCircle,
    XCircle,
    Star,
    Activity,
    Trash2,
} from 'lucide-react';
import { PubPremiumTable } from '@/components/publicites-premium/pub-premium-table';
import { PubPremiumViewModal } from '@/components/publicites-premium/pub-premium-view-modal';
import { PubPremiumFormModal } from '@/components/publicites-premium/pub-premium-form-modal';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function PublitesPremiumPage() {
    const {
        publicitesPremium,
        isLoading,
        stats,
        fetchPublitesPremium,
        approuverPublite,
        refuserPublite,
        deletePublitePremium,
    } = usePublitesPremiumStore();

    const isAdmin = useIsAdmin();

    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    const [selectedPub, setSelectedPub] = React.useState<PublicitePremium | undefined>();
    const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);

    // Dialog approbation
    const [pubAApprouver, setPubAApprouver] = React.useState<PublicitePremium | undefined>();
    const [isApprouverOpen, setIsApprouverOpen] = React.useState(false);
    const [isApprouverLoading, setIsApprouverLoading] = React.useState(false);

    // Dialog refus
    const [pubARefuser, setPubARefuser] = React.useState<PublicitePremium | undefined>();
    const [isRefuserOpen, setIsRefuserOpen] = React.useState(false);
    const [motifRefus, setMotifRefus] = React.useState('');
    const [isRefusLoading, setIsRefusLoading] = React.useState(false);

    // Modal création / édition
    const [formModalPub, setFormModalPub] = React.useState<PublicitePremium | undefined>();
    const [isFormModalOpen, setIsFormModalOpen] = React.useState(false);

    // Dialog suppression
    const [pubASupprimer, setPubASupprimer] = React.useState<PublicitePremium | undefined>();
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = React.useState(false);

    // Filtre statut
    const [filtreStatut, setFiltreStatut] = React.useState<string>('tous');

    React.useEffect(() => {
        fetchPublitesPremium().finally(() => setIsInitialLoading(false));
    }, [fetchPublitesPremium]);

    const listeFiltree = React.useMemo(() => {
        if (filtreStatut === 'tous') return publicitesPremium;
        return publicitesPremium.filter((p) => p.statut === filtreStatut);
    }, [publicitesPremium, filtreStatut]);

    // ========== HANDLERS ==========

    function handleView(pub: PublicitePremium) {
        setSelectedPub(pub);
        setIsViewModalOpen(true);
    }

    function handleApprouver(pub: PublicitePremium) {
        setPubAApprouver(pub);
        setIsApprouverOpen(true);
    }

    async function confirmApprouver() {
        if (!pubAApprouver) return;
        setIsApprouverLoading(true);
        try {
            await approuverPublite(pubAApprouver.id);
        } finally {
            setIsApprouverLoading(false);
            setIsApprouverOpen(false);
            setPubAApprouver(undefined);
        }
    }

    function handleRefuser(pub: PublicitePremium) {
        setPubARefuser(pub);
        setMotifRefus('');
        setIsRefuserOpen(true);
    }

    async function confirmRefuser() {
        if (!pubARefuser || !motifRefus.trim()) return;
        setIsRefusLoading(true);
        try {
            await refuserPublite(pubARefuser.id, motifRefus.trim());
        } finally {
            setIsRefusLoading(false);
            setIsRefuserOpen(false);
            setPubARefuser(undefined);
            setMotifRefus('');
        }
    }

    function handleEdit(pub: PublicitePremium) {
        setFormModalPub(pub);
        setIsFormModalOpen(true);
    }

    function handleDelete(pub: PublicitePremium) {
        setPubASupprimer(pub);
        setIsDeleteOpen(true);
    }

    async function confirmDelete() {
        if (!pubASupprimer) return;
        setIsDeleteLoading(true);
        try {
            await deletePublitePremium(pubASupprimer.id);
        } finally {
            setIsDeleteLoading(false);
            setIsDeleteOpen(false);
            setPubASupprimer(undefined);
        }
    }

    // ========== SKELETON ==========

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                </div>
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
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ========== RENDER ==========

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* EN-TÊTE */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Publicités Premium</h1>
                    <p className="text-muted-foreground">
                        Gérez les demandes de publicités premium des boutiques
                    </p>
                </div>
                <Button onClick={() => { setFormModalPub(undefined); setIsFormModalOpen(true); }}>
                    Nouvelle publicité premium
                </Button>
            </div>

            {/* STATISTIQUES */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Total des demandes
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Toutes demandes confondues</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            En attente
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-orange-500">{stats.en_attente}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">À traiter</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Approuvées
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-green-600">{stats.approuvees}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="text-xs">
                            {stats.actives_maintenant} en cours
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            Diffusées maintenant
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold text-blue-600">{stats.actives_maintenant}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Approuvées et dans leur période</p>
                    </CardContent>
                </Card>
            </div>

            {/* TABLEAU */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Toutes les demandes</CardTitle>
                            <CardDescription>
                                Consultez et traitez les demandes de publicités premium
                            </CardDescription>
                        </div>
                        <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                            <SelectTrigger className="w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tous">Tous les statuts</SelectItem>
                                <SelectItem value="en_attente">En attente</SelectItem>
                                <SelectItem value="approuve">Approuvées</SelectItem>
                                <SelectItem value="refuse">Refusées</SelectItem>
                                <SelectItem value="annule">Annulées</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <PubPremiumTable
                        publicites={listeFiltree}
                        isLoading={isLoading}
                        onView={handleView}
                        onApprouver={handleApprouver}
                        onRefuser={handleRefuser}
                        onEdit={isAdmin ? handleEdit : undefined}
                        onDelete={isAdmin ? handleDelete : undefined}
                    />
                </CardContent>
            </Card>

            {/* MODAL CRÉATION / ÉDITION */}
            <PubPremiumFormModal
                open={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setFormModalPub(undefined); }}
                pub={formModalPub}
            />

            {/* MODAL VISUALISATION */}
            <PubPremiumViewModal
                open={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setSelectedPub(undefined); }}
                pub={selectedPub}
            />

            {/* DIALOG APPROBATION */}
            <Dialog open={isApprouverOpen} onOpenChange={setIsApprouverOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer l'approbation</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Approuver la publicité{' '}
                        <span className="font-semibold text-foreground">{pubAApprouver?.titre}</span>{' '}
                        de la boutique{' '}
                        <span className="font-semibold text-foreground">{pubAApprouver?.boutique?.name}</span>{' '}
                        ? Elle sera diffusée selon les dates prévues.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApprouverOpen(false)} disabled={isApprouverLoading}>
                            Annuler
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={confirmApprouver}
                            disabled={isApprouverLoading}
                        >
                            {isApprouverLoading ? 'Approbation…' : 'Approuver'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG REFUS */}
            <Dialog open={isRefuserOpen} onOpenChange={setIsRefuserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Refuser la demande</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Refuser{' '}
                            <span className="font-semibold text-foreground">{pubARefuser?.titre}</span>{' '}
                            de{' '}
                            <span className="font-semibold text-foreground">{pubARefuser?.boutique?.name}</span>.
                        </p>
                        <div className="space-y-1">
                            <Label>Motif du refus *</Label>
                            <Textarea
                                value={motifRefus}
                                onChange={(e) => setMotifRefus(e.target.value)}
                                placeholder="Expliquez la raison du refus à la boutique…"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRefuserOpen(false)} disabled={isRefusLoading}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmRefuser}
                            disabled={isRefusLoading || !motifRefus.trim()}
                        >
                            {isRefusLoading ? 'Refus…' : 'Refuser la demande'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG SUPPRESSION */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Supprimer la publicité
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Supprimer définitivement{' '}
                        <span className="font-semibold text-foreground">{pubASupprimer?.titre}</span>{' '}
                        ? Cette action est irréversible.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleteLoading}
                        >
                            {isDeleteLoading ? 'Suppression…' : 'Supprimer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
