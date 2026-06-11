// components/livraisons/livraison-create-modal.tsx
'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck, ShoppingBag, Loader2, UserCheck } from "lucide-react";
import { type CreateLivraisonData, type LivreurOption, useLivraisonsStore } from '@/stores/livraisonsStore';
import { useAuthStore } from '@/stores/authStore';

interface Commande {
    id: string;
    numero: string;
    statut: string;
    prix: number;
    adresse_livraison?: string;
    users?: { name: string; phone?: string };
}

interface LivraisonCreateModalProps {
    open: boolean;
    onClose: () => void;
}

const formatPrice = (prix: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(prix);

const NO_LIVREUR = '__none__';

export function LivraisonCreateModal({ open, onClose }: LivraisonCreateModalProps) {
    const { createLivraison, fetchLivreurs, isLoading } = useLivraisonsStore();
    const token = useAuthStore((s) => s.token);

    const [commandes, setCommandes] = React.useState<Commande[]>([]);
    const [livreurs, setLivreurs] = React.useState<LivreurOption[]>([]);
    const [loadingCommandes, setLoadingCommandes] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const [form, setForm] = React.useState({
        commande_id: '',
        adresse: '',
        ville: '',
        phone: '',
        date_livraison: '',
        details: '',
        livreur_id: NO_LIVREUR,
    });

    const [errors, setErrors] = React.useState<Partial<Record<keyof typeof form, string>>>({});

    // Charger commandes et livreurs à l'ouverture
    React.useEffect(() => {
        if (!open || !token) return;

        setLoadingCommandes(true);
        fetch('/api/commandes/list?limit=100', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                const eligible = (data.commandes ?? []).filter((c: Commande) => {
                    const s = (c.statut ?? '').toLowerCase();
                    return s.includes('prete') || s.includes('préparation') || s.includes('preparation') || s.includes('attente');
                });
                setCommandes(eligible);
            })
            .catch(console.error)
            .finally(() => setLoadingCommandes(false));

        fetchLivreurs().then(setLivreurs);
    }, [open, token, fetchLivreurs]);

    // Pré-remplir adresse/téléphone depuis la commande sélectionnée
    const handleCommandeChange = (id: string) => {
        const c = commandes.find((c) => c.id === id);
        setForm((prev) => ({
            ...prev,
            commande_id: id,
            adresse: c?.adresse_livraison ?? prev.adresse,
            phone: c?.users?.phone ?? prev.phone,
        }));
        setErrors((e) => ({ ...e, commande_id: undefined }));
    };

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    };

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {};
        if (!form.commande_id) e.commande_id = 'Sélectionnez une commande';
        if (!form.adresse.trim()) e.adresse = 'Adresse requise';
        if (!form.ville.trim()) e.ville = 'Ville requise';
        if (!form.phone.trim()) e.phone = 'Téléphone requis';
        if (!form.date_livraison) e.date_livraison = 'Date requise';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSaving(true);
        try {
            const data: CreateLivraisonData = {
                commande_id: form.commande_id,
                adresse: form.adresse.trim(),
                ville: form.ville.trim(),
                phone: form.phone.trim(),
                date_livraison: new Date(form.date_livraison).toISOString(),
                details: form.details.trim() || undefined,
                livreur_id: form.livreur_id !== NO_LIVREUR ? form.livreur_id : null,
            };
            await createLivraison(data);
            handleClose();
        } catch {
            // toast déjà géré par le store
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setForm({ commande_id: '', adresse: '', ville: '', phone: '', date_livraison: '', details: '', livreur_id: NO_LIVREUR });
        setErrors({});
        onClose();
    };

    const selectedCommande = commandes.find((c) => c.id === form.commande_id);
    const livreurAssigne = livreurs.find((l) => l.id === form.livreur_id);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Créer une livraison
                    </DialogTitle>
                    <DialogDescription>
                        Associez une livraison à une commande prête pour l'expédition.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Commande */}
                    <div className="space-y-1.5">
                        <Label>Commande <span className="text-destructive">*</span></Label>
                        {loadingCommandes ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Chargement des commandes...
                            </div>
                        ) : (
                            <Select value={form.commande_id} onValueChange={handleCommandeChange}>
                                <SelectTrigger className={errors.commande_id ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Sélectionner une commande" />
                                </SelectTrigger>
                                <SelectContent>
                                    {commandes.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            Aucune commande éligible
                                        </div>
                                    ) : (
                                        commandes.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-mono font-semibold">#{c.numero}</span>
                                                    <span className="text-muted-foreground text-xs">— {formatPrice(c.prix)}</span>
                                                    <Badge variant="outline" className="text-xs h-4 px-1">{c.statut}</Badge>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                        {errors.commande_id && <p className="text-xs text-destructive">{errors.commande_id}</p>}
                        {selectedCommande?.users?.name && (
                            <p className="text-xs text-muted-foreground">Client : {selectedCommande.users.name}</p>
                        )}
                    </div>

                    {/* Adresse */}
                    <div className="space-y-1.5">
                        <Label htmlFor="adresse">Adresse <span className="text-destructive">*</span></Label>
                        <Input
                            id="adresse"
                            placeholder="Ex: Quartier Louis, Rue des Manguiers"
                            value={form.adresse}
                            onChange={(e) => handleChange('adresse', e.target.value)}
                            className={errors.adresse ? 'border-destructive' : ''}
                        />
                        {errors.adresse && <p className="text-xs text-destructive">{errors.adresse}</p>}
                    </div>

                    {/* Ville + Téléphone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="ville">Ville <span className="text-destructive">*</span></Label>
                            <Input
                                id="ville"
                                placeholder="Ex: Libreville"
                                value={form.ville}
                                onChange={(e) => handleChange('ville', e.target.value)}
                                className={errors.ville ? 'border-destructive' : ''}
                            />
                            {errors.ville && <p className="text-xs text-destructive">{errors.ville}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Téléphone <span className="text-destructive">*</span></Label>
                            <Input
                                id="phone"
                                placeholder="Ex: 074 00 00 00"
                                value={form.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className={errors.phone ? 'border-destructive' : ''}
                            />
                            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                        </div>
                    </div>

                    {/* Date prévue */}
                    <div className="space-y-1.5">
                        <Label htmlFor="date_livraison">Date prévue <span className="text-destructive">*</span></Label>
                        <Input
                            id="date_livraison"
                            type="datetime-local"
                            value={form.date_livraison}
                            onChange={(e) => handleChange('date_livraison', e.target.value)}
                            className={errors.date_livraison ? 'border-destructive' : ''}
                            min={new Date().toISOString().slice(0, 16)}
                        />
                        {errors.date_livraison && <p className="text-xs text-destructive">{errors.date_livraison}</p>}
                    </div>

                    {/* Livreur (optionnel) */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5" />
                            Livreur
                            <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
                        </Label>
                        <Select value={form.livreur_id} onValueChange={(v) => handleChange('livreur_id', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Assigner un livreur maintenant" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_LIVREUR}>
                                    <span className="text-muted-foreground italic">Aucun — à assigner plus tard</span>
                                </SelectItem>
                                {livreurs.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>{l.name}</span>
                                            {l.phone && (
                                                <span className="text-xs text-muted-foreground">· {l.phone}</span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {livreurAssigne && (
                            <p className="text-xs text-blue-600 font-medium">
                                La livraison passera directement en "En cours de livraison"
                            </p>
                        )}
                    </div>

                    {/* Détails optionnels */}
                    <div className="space-y-1.5">
                        <Label htmlFor="details">
                            Détails / Instructions
                            <span className="text-muted-foreground text-xs font-normal ml-1">(optionnel)</span>
                        </Label>
                        <Textarea
                            id="details"
                            placeholder="Ex: Appeler avant d'arriver, code portail : 1234..."
                            value={form.details}
                            onChange={(e) => handleChange('details', e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving || isLoading}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Création...
                            </>
                        ) : (
                            <>
                                <Truck className="mr-2 h-4 w-4" />
                                Créer la livraison
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
