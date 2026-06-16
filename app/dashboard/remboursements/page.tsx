// app/dashboard/remboursements/page.tsx
'use client';

import React from 'react';
import {
    useRemboursementsStore,
    type Remboursement,
    type RemboursementStatut,
} from '@/stores/remboursementsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Clock,
    Gavel,
    Loader2,
    CheckCircle,
    XCircle,
    Wallet,
    Eye,
} from 'lucide-react';

// ============================================
// HELPERS D'AFFICHAGE
// ============================================

const STATUT_BADGE: Record<RemboursementStatut, { label: string; className: string }> = {
    'En attente réponse vendeur': { label: 'Attente vendeur', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    'En attente arbitrage admin': { label: 'À arbitrer', className: 'bg-orange-100 text-orange-800 border-orange-300' },
    "En traitement par l'admin": { label: 'En traitement', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    'Remboursée': { label: 'Remboursée', className: 'bg-green-100 text-green-800 border-green-300' },
    'Rejetée': { label: 'Rejetée', className: 'bg-red-100 text-red-800 border-red-300' },
    'Annulée': { label: 'Annulée', className: 'bg-gray-100 text-gray-700 border-gray-300' },
};

function StatutBadge({ statut }: { statut: RemboursementStatut }) {
    const cfg = STATUT_BADGE[statut] ?? { label: statut, className: '' };
    return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}

function formatXAF(montant: number): string {
    return `${montant.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

// ============================================
// PAGE
// ============================================

export default function RemboursementsPage() {
    const {
        remboursements,
        stats,
        fetchAll,
        priseEnCharge,
        conclure,
    } = useRemboursementsStore();

    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    const [filter, setFilter] = React.useState<RemboursementStatut | 'all'>('all');
    const [selected, setSelected] = React.useState<Remboursement | null>(null);
    const [conclusionText, setConclusionText] = React.useState('');
    const [actionLoading, setActionLoading] = React.useState(false);

    React.useEffect(() => {
        fetchAll().finally(() => setIsInitialLoading(false));
    }, [fetchAll]);

    // Garder le détail ouvert synchronisé avec le store après une action
    React.useEffect(() => {
        if (!selected) return;
        const fresh = remboursements.find((r) => r.id === selected.id);
        if (fresh && fresh !== selected) setSelected(fresh);
    }, [remboursements, selected]);

    const filtered = React.useMemo(
        () => (filter === 'all' ? remboursements : remboursements.filter((r) => r.statut === filter)),
        [remboursements, filter],
    );

    const handlePriseEnCharge = async () => {
        if (!selected) return;
        setActionLoading(true);
        try {
            await priseEnCharge(selected.id);
        } finally {
            setActionLoading(false);
        }
    };

    const handleConclure = async (decision: 'Valider' | 'Rejeter') => {
        if (!selected) return;
        if (decision === 'Rejeter' && conclusionText.trim().length < 5) return;
        setActionLoading(true);
        try {
            await conclure(selected.id, decision, conclusionText.trim() || undefined);
            setConclusionText('');
        } finally {
            setActionLoading(false);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-9 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-12 mt-2" /></CardHeader></Card>
                    ))}
                </div>
                <Card><CardContent className="space-y-3 pt-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</CardContent></Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* En-tête */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Remboursements</h1>
                <p className="text-muted-foreground">
                    Arbitrez les demandes de remboursement entre clients et vendeurs
                </p>
            </div>

            {/* Statistiques / filtres */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="À arbitrer" value={stats.arbitrage} icon={<Gavel className="h-4 w-4 text-orange-600" />}
                    active={filter === 'En attente arbitrage admin'}
                    onClick={() => setFilter((f) => f === 'En attente arbitrage admin' ? 'all' : 'En attente arbitrage admin')} />
                <StatCard label="En traitement" value={stats.en_traitement} icon={<Loader2 className="h-4 w-4 text-blue-600" />}
                    active={filter === "En traitement par l'admin"}
                    onClick={() => setFilter((f) => f === "En traitement par l'admin" ? 'all' : "En traitement par l'admin")} />
                <StatCard label="Remboursées" value={stats.rembourses} icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                    active={filter === 'Remboursée'}
                    onClick={() => setFilter((f) => f === 'Remboursée' ? 'all' : 'Remboursée')} />
                <StatCard label="Rejetées" value={stats.rejetes} icon={<XCircle className="h-4 w-4 text-red-600" />}
                    active={filter === 'Rejetée'}
                    onClick={() => setFilter((f) => f === 'Rejetée' ? 'all' : 'Rejetée')} />
            </div>

            {/* Alerte demandes à arbitrer */}
            {stats.arbitrage > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                    <Gavel className="h-5 w-5 text-orange-600 shrink-0" />
                    <p className="text-sm text-orange-800">
                        <span className="font-semibold">{stats.arbitrage} demande{stats.arbitrage > 1 ? 's' : ''}</span>{' '}
                        en attente de votre arbitrage.
                    </p>
                </div>
            )}

            {/* Tableau */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>
                        {filter === 'all' ? 'Toutes les demandes' : STATUT_BADGE[filter].label}
                        <span className="text-muted-foreground font-normal"> ({filtered.length})</span>
                    </CardTitle>
                    {filter !== 'all' && (
                        <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>Réinitialiser</Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Commande</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Vendeur</TableHead>
                                <TableHead>Montant</TableHead>
                                <TableHead>Décision</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Créée le</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        Aucune demande de remboursement
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((r) => (
                                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                                        <TableCell className="font-medium">{r.commandes?.numero ?? '—'}</TableCell>
                                        <TableCell>{r.client?.name ?? '—'}</TableCell>
                                        <TableCell>{r.vendeur?.name ?? '—'}</TableCell>
                                        <TableCell>{formatXAF(r.montant)}</TableCell>
                                        <TableCell>
                                            {r.decision_vendeur
                                                ? <Badge variant="outline" className="text-xs">{r.decision_vendeur}</Badge>
                                                : <span className="text-muted-foreground text-xs">—</span>}
                                        </TableCell>
                                        <TableCell><StatutBadge statut={r.statut} /></TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{formatDate(r.created_at)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Détail + actions */}
            <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setConclusionText(''); } }}>
                <DialogContent className="max-w-lg">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Remboursement — {selected.commandes?.numero}
                                </DialogTitle>
                                <DialogDescription>
                                    {formatXAF(selected.montant)} · <StatutBadge statut={selected.statut} />
                                </DialogDescription>
                            </DialogHeader>

                            {/* Timeline du dossier */}
                            <div className="space-y-3 text-sm">
                                <InfoRow label="Client" value={selected.client?.name} sub={selected.client?.phone} />
                                <InfoRow label="Vendeur" value={selected.vendeur?.name ?? 'Non assigné'} />

                                <div className="rounded-md border bg-muted/30 p-3">
                                    <p className="font-medium text-xs text-muted-foreground mb-1">Motif du client</p>
                                    <p>{selected.motif}</p>
                                </div>

                                {selected.decision_vendeur && (
                                    <div className="rounded-md border bg-muted/30 p-3">
                                        <p className="font-medium text-xs text-muted-foreground mb-1">
                                            Réponse du vendeur : <span className="font-semibold">{selected.decision_vendeur}</span>
                                        </p>
                                        {selected.motif_vendeur && <p>{selected.motif_vendeur}</p>}
                                    </div>
                                )}

                                {selected.conclusion_admin && (
                                    <div className="rounded-md border bg-muted/30 p-3">
                                        <p className="font-medium text-xs text-muted-foreground mb-1">Conclusion de l&apos;administration</p>
                                        <p>{selected.conclusion_admin}</p>
                                    </div>
                                )}

                                {selected.rembourse_le && (
                                    <p className="text-xs text-green-700 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Remboursement validé le {formatDate(selected.rembourse_le)}
                                    </p>
                                )}
                            </div>

                            {/* Zone d'action admin selon le statut */}
                            {selected.statut === 'En attente arbitrage admin' && (
                                <DialogFooter>
                                    <Button onClick={handlePriseEnCharge} disabled={actionLoading}>
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                                        Prendre en charge
                                    </Button>
                                </DialogFooter>
                            )}

                            {selected.statut === "En traitement par l'admin" && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Conclusion (obligatoire en cas de rejet)
                                        </label>
                                        <Textarea
                                            value={conclusionText}
                                            onChange={(e) => setConclusionText(e.target.value)}
                                            placeholder="Expliquez votre décision…"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="outline"
                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                            onClick={() => handleConclure('Rejeter')}
                                            disabled={actionLoading || conclusionText.trim().length < 5}
                                        >
                                            <XCircle className="h-4 w-4" /> Rejeter
                                        </Button>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleConclure('Valider')}
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                            Valider le remboursement
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {selected.statut === 'En attente réponse vendeur' && (
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> En attente de la réponse du vendeur
                                    {selected.vendeur_deadline && ` (avant le ${formatDate(selected.vendeur_deadline)})`}.
                                </p>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

function StatCard({ label, value, icon, active, onClick }: {
    label: string; value: number; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
    return (
        <Card
            onClick={onClick}
            className={`cursor-pointer transition-all ${active ? 'ring-2 ring-primary/40 border-primary/50' : 'hover:border-primary/30'}`}
        >
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {icon} {label}
                </CardTitle>
                <p className="text-3xl font-bold">{value}</p>
            </CardHeader>
        </Card>
    );
}

function InfoRow({ label, value, sub }: { label: string; value?: string | null; sub?: string | null }) {
    return (
        <div className="flex justify-between items-start">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">
                {value ?? '—'}
                {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
            </span>
        </div>
    );
}
