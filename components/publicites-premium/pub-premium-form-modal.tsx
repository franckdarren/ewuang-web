'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    usePublitesPremiumStore,
    type CreatePublicitePremiumInput,
    type UpdatePublicitePremiumInput,
    type PublitePosition,
    type PublicitePremium,
} from '@/stores/publicitesPremiumStore';
import { useAuthStore, useIsAdmin } from '@/stores/authStore';
import { Upload, Link, X, ImageIcon, Loader2 } from 'lucide-react';

interface Categorie {
    id: string;
    nom: string;
    slug: string;
}

interface PubPremiumFormModalProps {
    open: boolean;
    onClose: () => void;
    pub?: PublicitePremium;
}

const POSITIONS: { value: PublitePosition; label: string }[] = [
    { value: 'banniere_accueil', label: 'Bannière accueil' },
    { value: 'banniere_categorie', label: 'Bannière catégorie' },
    { value: 'banniere_boutique', label: 'Bannière boutique' },
];

function isoToDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

export function PubPremiumFormModal({ open, onClose, pub }: PubPremiumFormModalProps) {
    const createPublitePremium = usePublitesPremiumStore((s) => s.createPublitePremium);
    const updatePublitePremium = usePublitesPremiumStore((s) => s.updatePublitePremium);
    const token = useAuthStore((s) => s.token);
    const isAdmin = useIsAdmin();
    const isEdit = !!pub;

    const [position, setPosition] = React.useState<PublitePosition>('banniere_accueil');
    const [titre, setTitre] = React.useState('');
    const [urlImage, setUrlImage] = React.useState('');
    const [imageMode, setImageMode] = React.useState<'url' | 'file'>('file');
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [filePreview, setFilePreview] = React.useState<string | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [lien, setLien] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [dateStart, setDateStart] = React.useState('');
    const [dateEnd, setDateEnd] = React.useState('');
    const [categorieId, setCategorieId] = React.useState('');
    const [boutiqueId, setBoutiqueId] = React.useState('');
    const [prix, setPrix] = React.useState('');
    const [categories, setCategories] = React.useState<Categorie[]>([]);
    const [boutiques, setBoutiques] = React.useState<{ id: string; name: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Charger les catégories
    React.useEffect(() => {
        if (!open || !token) return;
        fetch('/api/categories/list', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((j) => setCategories(j.categories ?? []))
            .catch(() => {});
    }, [open, token]);

    // Charger les boutiques (admin uniquement, pour banniere_boutique)
    React.useEffect(() => {
        if (!open || !token || !isAdmin || position !== 'banniere_boutique') return;
        fetch('/api/users/list', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data: { id: string; name: string; role: string }[]) =>
                setBoutiques((data ?? []).filter((u) => u.role === 'Boutique'))
            )
            .catch(() => {});
    }, [open, token, isAdmin, position]);

    // Initialiser depuis pub (mode édition) ou reset (mode création)
    React.useEffect(() => {
        if (!open) return;
        if (pub) {
            setPosition(pub.position);
            setTitre(pub.titre);
            setImageMode('url');
            setUrlImage(pub.url_image);
            setLien(pub.lien ?? '');
            setDescription(pub.description ?? '');
            setDateStart(isoToDatetimeLocal(pub.date_start));
            setDateEnd(isoToDatetimeLocal(pub.date_end));
            setCategorieId(pub.categorie_id ?? '');
            setBoutiqueId(pub.boutique_id ?? '');
            setPrix(pub.prix != null ? String(pub.prix) : '');
            setError(null);
        } else {
            resetFields();
        }
    }, [open, pub]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setFilePreview(URL.createObjectURL(file));
        setError(null);
    }

    function clearFile() {
        setSelectedFile(null);
        if (filePreview) URL.revokeObjectURL(filePreview);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function uploadFile(): Promise<string> {
        if (!selectedFile) throw new Error('Aucun fichier sélectionné');

        const t = useAuthStore.getState().token;
        if (!t) throw new Error('Non authentifié');

        // Upload via endpoint serveur same-origin au nom neutre : un appel
        // direct navigateur -> supabase.co/.../publicites/... est bloqué par
        // les bloqueurs de pub. Voir mémoire [[adblock-route-naming]].
        const fd = new FormData();
        fd.append('file', selectedFile);

        const res = await fetch('/api/medias/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${t}` },
            body: fd,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error ?? "Erreur lors de l'upload de l'image");
        }

        const { url } = await res.json();
        return url as string;
    }

    function resetFields() {
        setPosition('banniere_accueil');
        setTitre('');
        setUrlImage('');
        setImageMode('file');
        clearFile();
        setLien('');
        setDescription('');
        setDateStart('');
        setDateEnd('');
        setCategorieId('');
        setBoutiqueId('');
        setPrix('');
        setError(null);
    }

    function handleClose() {
        resetFields();
        onClose();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!titre.trim()) { setError('Le titre est requis'); return; }
        if (imageMode === 'url' && !urlImage.trim()) { setError("L'URL de l'image est requise"); return; }
        if (imageMode === 'file' && !selectedFile && !isEdit) { setError('Veuillez choisir un fichier image'); return; }
        if (!dateStart || !dateEnd) { setError('Les dates sont requises'); return; }
        if (new Date(dateEnd) <= new Date(dateStart)) {
            setError('La date de fin doit être après la date de début');
            return;
        }
        if (position === 'banniere_categorie' && !categorieId) {
            setError('Veuillez sélectionner une catégorie');
            return;
        }
        if (isAdmin && position === 'banniere_boutique' && !boutiqueId) {
            setError('Veuillez sélectionner une boutique');
            return;
        }

        setIsSubmitting(true);
        try {
            let finalUrlImage = urlImage.trim();
            if (imageMode === 'file' && selectedFile) {
                setIsUploading(true);
                finalUrlImage = await uploadFile();
                setIsUploading(false);
            }

            if (isEdit && pub) {
                const payload: UpdatePublicitePremiumInput = {
                    position,
                    titre: titre.trim(),
                    url_image: finalUrlImage || pub.url_image,
                    lien: lien.trim() || null,
                    description: description.trim() || null,
                    date_start: new Date(dateStart).toISOString(),
                    date_end: new Date(dateEnd).toISOString(),
                    categorie_id: position === 'banniere_categorie' ? categorieId : null,
                    prix: prix ? parseInt(prix, 10) : null,
                };
                await updatePublitePremium(pub.id, payload);
            } else {
                const payload: CreatePublicitePremiumInput = {
                    position,
                    titre: titre.trim(),
                    url_image: finalUrlImage,
                    lien: lien.trim() || null,
                    description: description.trim() || null,
                    date_start: new Date(dateStart).toISOString(),
                    date_end: new Date(dateEnd).toISOString(),
                    categorie_id: position === 'banniere_categorie' ? categorieId : null,
                    boutique_id: isAdmin && position === 'banniere_boutique' ? boutiqueId : null,
                    prix: prix ? parseInt(prix, 10) : null,
                };
                await createPublitePremium(payload);
            }

            handleClose();
        } catch (err: unknown) {
            setIsUploading(false);
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission');
        } finally {
            setIsSubmitting(false);
        }
    }

    const modalTitle = isEdit
        ? 'Modifier la publicité premium'
        : isAdmin ? 'Ajouter une publicité premium' : 'Nouvelle publicité premium';

    const submitLabel = isEdit
        ? 'Enregistrer les modifications'
        : isAdmin ? 'Ajouter' : 'Soumettre la demande';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{modalTitle}</DialogTitle>
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

                    {isAdmin && position === 'banniere_boutique' && (
                        <div className="space-y-1">
                            <Label>Boutique *</Label>
                            <Select value={boutiqueId} onValueChange={setBoutiqueId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une boutique" />
                                </SelectTrigger>
                                <SelectContent>
                                    {boutiques.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1">
                        <Label>Titre *</Label>
                        <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de la publicité" />
                    </div>

                    {/* IMAGE */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Image *</Label>
                            <div className="flex rounded-md border text-xs overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => { setImageMode('file'); setUrlImage(''); }}
                                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${imageMode === 'file' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                >
                                    <Upload className="h-3 w-3" />
                                    Fichier
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setImageMode('url'); clearFile(); }}
                                    className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${imageMode === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                >
                                    <Link className="h-3 w-3" />
                                    URL
                                </button>
                            </div>
                        </div>

                        {imageMode === 'file' ? (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {filePreview ? (
                                    <div className="relative rounded-md border overflow-hidden">
                                        <img
                                            src={filePreview}
                                            alt="Aperçu"
                                            className="w-full h-32 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={clearFile}
                                            className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-6 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <ImageIcon className="h-8 w-8" />
                                        <span className="text-sm">Cliquer pour choisir un fichier</span>
                                        <span className="text-xs">JPG, PNG, WebP, GIF — max 5 Mo</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Input
                                value={urlImage}
                                onChange={(e) => setUrlImage(e.target.value)}
                                placeholder="https://..."
                            />
                        )}
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
                            {isUploading ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Upload…</>
                            ) : isSubmitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" />{isEdit ? 'Enregistrement…' : 'Envoi…'}</>
                            ) : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
