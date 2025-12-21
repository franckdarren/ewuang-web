// components/categories/edit-categorie-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from "sonner";

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
import {
    useCategoriesStore,
    type Categorie
} from '@/stores/categoriesStore';

interface EditCategorieModalProps {
    isOpen: boolean;
    onClose: () => void;
    categorie: Categorie | null;
}

export function EditCategorieModal({
    isOpen,
    onClose,
    categorie
}: EditCategorieModalProps) {
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
    const [error, setError] = useState('');
    const [slugModifiedManually, setSlugModifiedManually] = useState(false);

    // ============================================
    // STORE
    // ============================================

    const updateCategorie = useCategoriesStore((state) => state.updateCategorie);

    // Récupérer la méthode mais ne pas l'exécuter dans le hook
    const getCategoriesRacines = useCategoriesStore(state => state.categoriesRacines);

    // Appeler la méthode une seule fois
    const categoriesRacines: Categorie[] = getCategoriesRacines();

    // Filtrer pour ne pas permettre de sélectionner la catégorie elle-même comme parent
    const availableParents = categoriesRacines.filter(
        (cat: Categorie) => cat.id !== categorie?.id
    );


    // ============================================
    // EFFETS
    // ============================================

    /**
     * Initialiser le formulaire avec les données de la catégorie
     */
    useEffect(() => {
        if (isOpen && categorie) {
            setFormData({
                nom: categorie.nom,
                slug: categorie.slug,
                description: categorie.description || '',
                image: categorie.image || '',
                parent_id: categorie.parent_id || '',
                is_active: categorie.is_active,
                ordre: categorie.ordre,
            });
            setError('');
        }
    }, [isOpen, categorie]);

    /**
   * Générer le slug automatiquement si le nom change
   */
    useEffect(() => {
        if (formData.nom && !slugModifiedManually && categorie) {
            // Générer seulement si le nom a changé par rapport à l'original
            if (formData.nom !== categorie.nom) {
                const slug = formData.nom
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                setFormData(prev => ({ ...prev, slug }));
            }
        }
    }, [formData.nom, slugModifiedManually, categorie]);


    // ============================================
    // HANDLERS
    // ============================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!categorie) return;

        setIsLoading(true);
        setError('');

        try {
            // Validation
            if (!formData.nom.trim()) {
                throw new Error('Le nom est obligatoire');
            }

            // Préparer les données (uniquement les champs modifiés)
            const updates: any = {};

            if (formData.nom !== categorie.nom) {
                updates.nom = formData.nom.trim();
            }

            if (formData.slug !== categorie.slug) {
                updates.slug = formData.slug.trim();
            }

            if (formData.description !== (categorie.description || '')) {
                updates.description = formData.description.trim() || null;
            }

            if (formData.image !== (categorie.image || '')) {
                updates.image = formData.image.trim() || null;
            }

            if (formData.parent_id !== (categorie.parent_id || '')) {
                updates.parent_id = formData.parent_id || null;
            }

            if (formData.is_active !== categorie.is_active) {
                updates.is_active = formData.is_active;
            }

            if (formData.ordre !== categorie.ordre) {
                updates.ordre = formData.ordre;
            }

            // Mettre à jour seulement si des changements ont été faits
            if (Object.keys(updates).length === 0) {
                onClose();
                return;
            }

            // Mettre à jour la catégorie
            await updateCategorie(categorie.id, updates);

            // Fermer la modale
            onClose();

            // Notification de succès
            toast.success("Catégorie mise à jour avec succès");

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
            toast.error("Erreur lors de la mise à jour de la catégorie");

        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Ne rien afficher si pas de catégorie
    if (!categorie) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Modifier la catégorie</DialogTitle>
                    <DialogDescription>
                        Modifiez les informations de la catégorie "{categorie.nom}"
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Message d'erreur */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* ID (lecture seule, pour info) */}
                    <div className="space-y-2">
                        <Label>ID de la catégorie</Label>
                        <Input
                            value={categorie.id}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    {/* Nom */}
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

                    {/* Slug */}
                    <div className="space-y-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => handleChange('slug', e.target.value)}
                            placeholder="electronique"
                        />
                        <p className="text-xs text-muted-foreground">
                            URL actuelle : /categories/{formData.slug}
                        </p>
                    </div>

                    {/* Description */}
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

                    {/* Image */}
                    <div className="space-y-2">
                        <Label htmlFor="image">URL de l'image</Label>
                        <Input
                            id="image"
                            type="url"
                            value={formData.image}
                            onChange={(e) => handleChange('image', e.target.value)}
                            placeholder="https://example.com/image.jpg"
                        />
                        {formData.image && (
                            <div className="mt-2">
                                <img
                                    src={formData.image}
                                    alt="Aperçu"
                                    className="h-20 w-20 object-cover rounded border"
                                    onError={(e) => {
                                        e.currentTarget.src = '/placeholder.png';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Catégorie parente */}
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
                                {availableParents.map((cat: Categorie) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {categorie.children && categorie.children.length > 0 && (
                            <p className="text-xs text-orange-600">
                                ⚠️ Cette catégorie a {categorie.children.length} sous-catégorie(s)
                            </p>
                        )}
                    </div>

                    {/* Ordre */}
                    <div className="space-y-2">
                        <Label htmlFor="ordre">Ordre d'affichage</Label>
                        <Input
                            id="ordre"
                            type="number"
                            value={formData.ordre}
                            onChange={(e) => handleChange('ordre', parseInt(e.target.value) || 0)}
                            min="0"
                        />
                    </div>

                    {/* Statut actif */}
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

                    {/* Informations additionnelles */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Créée le :</span>
                            <span className="font-medium">
                                {new Date(categorie.created_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Dernière modification :</span>
                            <span className="font-medium">
                                {new Date(categorie.updated_at).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                        {categorie._count?.articles !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Nombre d'articles :</span>
                                <span className="font-medium">{categorie._count.articles}</span>
                            </div>
                        )}
                    </div>

                    {/* Boutons */}
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
                            {isLoading ? 'Mise à jour...' : 'Enregistrer les modifications'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}