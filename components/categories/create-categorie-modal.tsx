// components/categories/create-categorie-modal.tsx
'use client';

import { useState, useEffect } from 'react';
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
import { useCategoriesStore, type Categorie } from '@/stores/categoriesStore';

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
    const [error, setError] = useState('');

    // ============================================
    // STORE
    // ============================================

    // Hook pour créer une catégorie
    const createCategorie = useCategoriesStore(state => state.createCategorie);

    // Hook pour récupérer la méthode categoriesRacines
    const getCategoriesRacines = useCategoriesStore(state => state.categoriesRacines);

    // Appel de la méthode hors du hook pour éviter infinite loop
    const categoriesRacines: Categorie[] = getCategoriesRacines();

    // Filtrer pour ne pas permettre de sélectionner la catégorie elle-même comme parent
    const availableParents = categoriesRacines; // Ici, création donc pas de self-filter

    // ============================================
    // HANDLERS
    // ============================================

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setError('');

        try {
            // Validation
            if (!formData.nom.trim()) {
                throw new Error('Le nom est obligatoire');
            }

            // Préparer les données
            const newCategorie = {
                ...formData,
                slug: formData.slug.trim() || undefined,
                description: formData.description.trim() || undefined,
                image: formData.image.trim() || undefined,
                parent_id: formData.parent_id || null,
            };

            // Création via le store
            await createCategorie(newCategorie);

            // Fermer la modale
            onClose();

            // Notification succès
            alert('Catégorie créée avec succès !');

            // Réinitialiser le formulaire
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
            setError(err instanceof Error ? err.message : 'Erreur lors de la création');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Ne rien afficher si modal fermée
    if (!isOpen) return null;

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
                    {/* Message d'erreur */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

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
                            URL prévue : /categories/{formData.slug}
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
                                    onError={(e) => { e.currentTarget.src = '/placeholder.png'; }}
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
                                <SelectItem value="">Aucune (catégorie racine)</SelectItem>
                                {availableParents.map((cat: Categorie) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                            {isLoading ? 'Création...' : 'Créer la catégorie'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
