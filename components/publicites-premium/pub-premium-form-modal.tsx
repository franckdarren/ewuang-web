'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublitesPremiumStore, type CreatePublicitePremiumInput, type PublitePosition } from '@/stores/publicitesPremiumStore';
import { useAuthStore } from '@/stores/authStore';

interface Categorie {
    id: string;
    nom: string;
    slug: string;
}

interface PubPremiumFormModalProps {
    open: boolean;
    onClose: () => void;
}

const POSITIONS: { value: PublitePosition; label: string }[] = [
    { value: 'banniere_accueil', label: 'Bannière accueil' },
    { value: 'banniere_categorie', label: 'Bannière catégorie' },
    { value: 'banniere_boutique', label: 'Bannière boutique' },
];

export function PubPremiumFormModal({ open, onClose }: PubPremiumFormModalProps) {
    const createPublitePremium = usePublitesPremiumStore((s) => s.createPublitePremium);
    const token = useAuthStore((s) => s.token);

    const [position, setPosition] = React.useState<PublitePosition>('banniere_accueil');
    const [titre, setTitre] = React.useState('');
    const [urlImage, setUrlImage] = React.useState('');
    const [lien, setLien] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [dateStart, setDateStart] = React.useState('');
    const [dateEnd, setDateEnd] = React.useState('');
    const [categorieId, setCategorieId] = React.useState('');
    const [prix, setPrix] = React.useState('');
    const [categories, setCategories] = React.useState<Categorie[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open || !token) return;
        fetch('/api/categories/list', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((j) => setCategories(j.categories ?? []))
            .catch(() => {});
    }, [open, token]);

    function reset() {
        setPosition('banniere_accueil');
        setTitre('');
        setUrlImage('');
        setLien('');
        setDescription('');
        setDateStart('');
        setDateEnd('');
        setCategorieId('');
        setPrix('');
        setError(null);
    }

    function handleClose() {
        reset();
        onClose();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!titre.trim()) { setError('Le titre est requis'); return; }
        if (!urlImage.trim()) { setError("L'URL de l'image est requise"); return; }
        if (!dateStart || !dateEnd) { setError('Les dates sont requises'); return; }
        if (new Date(dateEnd) <= new Date(dateStart)) {
            setError('La date de fin doit être après la date de début');
            return;
        }
        if (position === 'banniere_categorie' && !categorieId) {
            setError('Veuillez sélectionner une catégorie');
            return;
        }

        const payload: CreatePublicitePremiumInput = {
            position,
            titre: titre.trim(),
            url_image: urlImage.trim(),
            lien: lien.trim() || null,
            description: description.trim() || null,
            date_start: new Date(dateStart).toISOString(),
            date_end: new Date(dateEnd).toISOString(),
            categorie_id: position === 'banniere_categorie' ? categorieId : null,
            prix: prix ? parseInt(prix, 10) : null,
        };

        setIsSubmitting(true);
        try {
            await createPublitePremium(payload);
            handleClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Nouvelle publicité premium</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
                    <div className="space-y-1">
                        <Label>Emplacement *</Label>
                        <Select value={position} onValueChange={(v) => setPosition(v as PublitePosition)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {POSITIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {position === 'banniere_categorie' && (
                        <div className="space-y-1">
                            <Label>Catégorie *</Label>
                            <Select value={categorieId} onValueChange={setCategorieId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une catégorie" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1">
                        <Label>Titre *</Label>
                        <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de la publicité" />
                    </div>

                    <div className="space-y-1">
                        <Label>URL de l'image *</Label>
                        <Input value={urlImage} onChange={(e) => setUrlImage(e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="space-y-1">
                        <Label>Lien de destination</Label>
                        <Input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://..." />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Date de début *</Label>
                            <Input type="datetime-local" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Date de fin *</Label>
                            <Input type="datetime-local" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Budget proposé (XAF)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={prix}
                            onChange={(e) => setPrix(e.target.value)}
                            placeholder="Ex : 50000"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Message ou contexte de la publicité"
                            rows={3}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Envoi…' : 'Soumettre la demande'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
