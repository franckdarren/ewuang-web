
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabaseBrowser } from '@/app/utils/supabase/clients';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

const BUCKET_NAME = 'categories-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface CreateCategorieModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateCategorieModal({ isOpen, onClose }: CreateCategorieModalProps) {
    // ============================================
    // ÉTAT LOCAL
    // ============================================

    const [formData, setFormData] = useState({
        nom: '',
        slug: '',
        description: '',
        image: '',
        parent_id: '',
        is_active: true,
        ordre: 0,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ============================================
    // STORE - RÉCUPÉRATION DIRECTE
    // ============================================

    const createCategorie = useCategoriesStore(state => state.createCategorie);
    const fetchCategories = useCategoriesStore(state => state.fetchCategories);
    const allCategories = useCategoriesStore(state => state.categories);

    // ============================================
    // CALCUL DES CATÉGORIES RACINES AVEC useMemo
    // ============================================

    /**
     * useMemo garantit que le tableau n'est recalculé
     * QUE si allCategories change réellement
     */
    const categoriesRacines = useMemo(() => {
        return allCategories.filter(cat => !cat.parent_id);
    }, [allCategories]);

    // ============================================
    // EFFETS
    // ============================================

    /**
     * Charger les catégories si nécessaire
     */
    useEffect(() => {
        if (isOpen && allCategories.length === 0) {
            fetchCategories();
        }
    }, [isOpen]); // Dépendance minimale

    /**
     * Réinitialiser le formulaire
     */
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                nom: '',
                slug: '',
                description: '',
                image: '',
                parent_id: '',
                is_active: true,
                ordre: 0,
            });
            setError('');
        }
    }, [isOpen]);

    /**
     * Générer le slug automatiquement EN TEMPS RÉEL
     * 
     * IMPORTANT : On garde un état séparé pour savoir si l'utilisateur
     * a modifié manuellement le slug
     */
    const [slugModifiedManually, setSlugModifiedManually] = useState(false);

    useEffect(() => {
        // Ne régénérer le slug automatiquement que si :
        // 1. Il y a un nom
        // 2. L'utilisateur n'a pas modifié le slug manuellement
        if (formData.nom && !slugModifiedManually) {
            const slug = formData.nom
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            setFormData(prev => ({ ...prev, slug }));
        }
    }, [formData.nom, slugModifiedManually]); // Ne dépend plus de formData.slug !

    /**
     * Réinitialiser le flag quand la modale s'ouvre
     */
    useEffect(() => {
        if (isOpen) {
            setSlugModifiedManually(false);
        }
    }, [isOpen]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (!formData.nom.trim()) {
                throw new Error('Le nom est obligatoire');
            }

            const newCategorie = {
                nom: formData.nom.trim(),
                slug: formData.slug.trim() || undefined,
                description: formData.description.trim() || undefined,
                image: formData.image.trim() || undefined,
                parent_id: formData.parent_id && formData.parent_id !== 'none'
                    ? formData.parent_id
                    : null,
                is_active: formData.is_active,
                ordre: formData.ordre,
            };

            console.log('📝 Données du formulaire:', newCategorie);

            await createCategorie(newCategorie);

            onClose();
            toast.success("Catégorie créée avec succès");

            setFormData({
                nom: '',
                slug: '',
                description: '',
                image: '',
                parent_id: '',
                is_active: true,
                ordre: 0,
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
            console.error('❌ Erreur dans le formulaire:', errorMessage);
            setError(errorMessage);
            toast.error("Erreur lors de la création de la catégorie");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        // Si l'utilisateur modifie le slug manuellement, arrêter la génération auto
        if (field === 'slug') {
            setSlugModifiedManually(true);
        }

        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (file: File) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            toast.error('Type de fichier non accepté', { description: 'Formats acceptés : JPG, PNG, WEBP' });
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error('Fichier trop volumineux', { description: 'Taille maximum : 5 MB' });
            return;
        }

        setIsUploading(true);
        try {
            const supabase = supabaseBrowser();

            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw new Error(uploadError.message);

            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            handleChange('image', urlData.publicUrl);
            toast.success('Image uploadée avec succès');
        } catch (err: any) {
            toast.error("Erreur lors de l'upload", { description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Créer une nouvelle catégorie</DialogTitle>
                    <DialogDescription>
                        Remplissez les informations pour créer une catégorie.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="nom">
                            Nom <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="nom"
                            value={formData.nom}
                            onChange={(e) => handleChange('nom', e.target.value)}
                            placeholder="Ex: Électronique"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="slug">
                                Slug
                                <span className="text-sm text-muted-foreground ml-2">
                                    (Généré automatiquement)
                                </span>
                            </Label>
                            {slugModifiedManually && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSlugModifiedManually(false);
                                        // Le useEffect régénérera automatiquement le slug
                                    }}
                                    className="text-xs h-6"
                                >
                                    Régénérer automatiquement
                                </Button>
                            )}
                        </div>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => handleChange('slug', e.target.value)}
                            placeholder="electronique"
                        />
                        <p className="text-xs text-muted-foreground">
                            URL prévue : /categories/{formData.slug || '...'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Description de la catégorie..."
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Image</Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                                e.target.value = '';
                            }}
                        />
                        {formData.image ? (
                            <div className="relative w-full h-40 rounded-lg border overflow-hidden group">
                                <img
                                    src={formData.image}
                                    alt="Aperçu"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={isUploading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                        Changer
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleChange('image', '')}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Upload en cours...</p>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                        <p className="text-sm font-medium">Cliquer pour ajouter une image</p>
                                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — max 5 MB</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="parent_id">Catégorie parente</Label>
                        <Select
                            value={formData.parent_id}
                            onValueChange={(value) => handleChange('parent_id', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Aucune (catégorie racine)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Aucune (catégorie racine)</SelectItem>
                                {categoriesRacines.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Laissez vide pour créer une catégorie principale
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ordre">Ordre d'affichage</Label>
                        <Input
                            id="ordre"
                            type="number"
                            value={formData.ordre}
                            onChange={(e) => handleChange('ordre', parseInt(e.target.value) || 0)}
                            min="0"
                        />
                        <p className="text-xs text-muted-foreground">
                            Les catégories seront triées par ordre croissant
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active">Catégorie active</Label>
                            <p className="text-sm text-muted-foreground">
                                Les catégories inactives ne s'affichent pas publiquement
                            </p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => handleChange('is_active', checked)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Création...' : 'Créer la catégorie'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}