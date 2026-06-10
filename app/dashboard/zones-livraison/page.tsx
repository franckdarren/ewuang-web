'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    useZonesLivraisonStore,
    type ZoneLivraison,
} from '@/stores/zonesLivraisonStore';
import { useAuthStore } from '@/stores/authStore';

const formatXAF = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

interface FormState {
    ville: string;
    tarif: string;
    is_active: boolean;
    is_default: boolean;
}

const emptyForm: FormState = {
    ville: '',
    tarif: '',
    is_active: true,
    is_default: false,
};

export default function ZonesLivraisonPage() {
    const zones = useZonesLivraisonStore(s => s.zones);
    const isLoading = useZonesLivraisonStore(s => s.isLoading);
    const fetchZones = useZonesLivraisonStore(s => s.fetchZones);
    const createZone = useZonesLivraisonStore(s => s.createZone);
    const updateZone = useZonesLivraisonStore(s => s.updateZone);
    const deleteZone = useZonesLivraisonStore(s => s.deleteZone);
    const toggleActive = useZonesLivraisonStore(s => s.toggleActive);

    const { user, isAuthenticated } = useAuthStore();

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<ZoneLivraison | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchZones(true).finally(() => setIsInitialLoading(false));
    }, [fetchZones]);

    const stats = useMemo(() => {
        const total = zones.length;
        const actives = zones.filter(z => z.is_active).length;
        const tarifMin = zones.length ? Math.min(...zones.map(z => z.tarif)) : 0;
        const tarifMax = zones.length ? Math.max(...zones.map(z => z.tarif)) : 0;
        return { total, actives, tarifMin, tarifMax };
    }, [zones]);

    const openCreate = () => {
        setEditingZone(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (zone: ZoneLivraison) => {
        setEditingZone(zone);
        setForm({
            ville: zone.ville,
            tarif: String(zone.tarif),
            is_active: zone.is_active,
            is_default: zone.is_default,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        const ville = form.ville.trim();
        const tarif = Number.parseInt(form.tarif, 10);

        if (!ville) {
            toast.error('Le nom de la ville est requis');
            return;
        }
        if (!Number.isFinite(tarif) || tarif < 0) {
            toast.error('Le tarif doit être un nombre positif');
            return;
        }

        setSubmitting(true);
        try {
            if (editingZone) {
                await updateZone(editingZone.id, {
                    ville,
                    tarif,
                    is_active: form.is_active,
                    is_default: form.is_default,
                });
            } else {
                await createZone({
                    ville,
                    tarif,
                    is_active: form.is_active,
                    is_default: form.is_default,
                });
            }
            setDialogOpen(false);
        } catch {
            // toast d'erreur déjà géré par le store
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (zone: ZoneLivraison) => {
        if (zone.is_default) {
            toast.error('Impossible de supprimer la zone par défaut');
            return;
        }
        toast(`Supprimer la zone "${zone.ville}" ?`, {
            action: {
                label: 'Supprimer',
                onClick: async () => {
                    try {
                        await deleteZone(zone.id);
                    } catch {
                        /* erreur déjà toastée */
                    }
                },
            },
            dismissible: true,
            duration: 15000,
        });
    };

    const canCreate = isAuthenticated && user?.role === 'Administrateur';

    if (isInitialLoading) {
        return (
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-9 w-16 mt-1" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="space-y-3 pt-4">
                        <Skeleton className="h-10 w-full" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Zones de livraison</h1>
                    <p className="text-muted-foreground">
                        Configurez le tarif de livraison appliqué à chaque ville. La zone marquée
                        « par défaut » s&apos;applique aux villes non listées.
                    </p>
                </div>
                <Button onClick={openCreate} disabled={!canCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une zone
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Zones configurées</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Zones actives</CardDescription>
                        <CardTitle className="text-3xl font-bold">{stats.actives}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Tarif minimum</CardDescription>
                        <CardTitle className="text-2xl font-bold">
                            {formatXAF(stats.tarifMin)}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Tarif maximum</CardDescription>
                        <CardTitle className="text-2xl font-bold">
                            {formatXAF(stats.tarifMax)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ville</TableHead>
                                <TableHead>Tarif</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Par défaut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {zones.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        Aucune zone configurée. Cliquez sur « Ajouter une zone » pour commencer.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                zones.map(zone => (
                                    <TableRow key={zone.id}>
                                        <TableCell className="font-medium">{zone.ville}</TableCell>
                                        <TableCell>{formatXAF(zone.tarif)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={zone.is_active}
                                                    disabled={!canCreate || isLoading}
                                                    onCheckedChange={(v) => toggleActive(zone.id, v)}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {zone.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {zone.is_default ? (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Star className="h-3 w-3 fill-current" />
                                                    Par défaut
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEdit(zone)}
                                                disabled={!canCreate}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(zone)}
                                                disabled={!canCreate || zone.is_default}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingZone ? 'Modifier la zone' : 'Nouvelle zone de livraison'}
                        </DialogTitle>
                        <DialogDescription>
                            Définissez la ville et le tarif facturé au client pour la livraison.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="ville">Ville</Label>
                            <Input
                                id="ville"
                                value={form.ville}
                                onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                                placeholder="Ex : Libreville"
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tarif">Tarif (FCFA)</Label>
                            <Input
                                id="tarif"
                                type="number"
                                min={0}
                                step={100}
                                value={form.tarif}
                                onChange={e => setForm(f => ({ ...f, tarif: e.target.value }))}
                                placeholder="Ex : 2500"
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-3">
                            <div>
                                <Label className="cursor-pointer" htmlFor="is_active">Zone active</Label>
                                <p className="text-xs text-muted-foreground">
                                    Inactive = invisible côté client.
                                </p>
                            </div>
                            <Switch
                                id="is_active"
                                checked={form.is_active}
                                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-3">
                            <div>
                                <Label className="cursor-pointer" htmlFor="is_default">Zone par défaut</Label>
                                <p className="text-xs text-muted-foreground">
                                    Tarif appliqué aux villes non listées. Une seule zone par défaut à la fois.
                                </p>
                            </div>
                            <Switch
                                id="is_default"
                                checked={form.is_default}
                                onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enregistrement…
                                </>
                            ) : editingZone ? (
                                'Mettre à jour'
                            ) : (
                                'Créer'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
