// components/categories/create-categorie-modal.tsx
// VERSION ALTERNATIVE SANS SÉLECTEUR - GARANTIE SANS BOUCLE
'use client';

import { useState, useEffect, useMemo } from 'react';
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
     * Générer le slug automatiquement
     */
    useEffect(() => {
        if (formData.nom && !formData.slug) {
            const slug = formData.nom
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            
            setFormData(prev => ({ ...prev, slug }));
        }
    }, [formData.nom, formData.slug]); // Dépendances précises

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
            alert('Catégorie créée avec succès !');

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
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                        <Label htmlFor="slug">
                            Slug
                            <span className="text-sm text-muted-foreground ml-2">
                                (Généré automatiquement)
                            </span>
                        </Label>
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
                                        e.currentTarget.src = "https://via.placeholder.com/80";
                                    }}
                                />
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