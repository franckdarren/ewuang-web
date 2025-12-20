'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Edit,
    Trash2,
    Folder,
    FolderOpen,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    useCategoriesStore,
    type Categorie
} from '@/stores/categoriesStore';
import { CategoriesTable } from '../../../components/categories/categories-table';
import { CreateCategorieModal } from '../../../components/categories/create-categorie-modal';
import { EditCategorieModal } from '../../../components/categories/edit-categorie-modal';
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';

export default function CategoriePage() {
    // ============================================
    // ÉTAT LOCAL
    // ============================================

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [categorieToEdit, setCategorieToEdit] = useState<Categorie | null>(null);

    // ============================================
    // STORE CATEGORIES
    // ============================================

    const {
        categories,
        fetchCategories,
        deleteCategorie,
        toggleCategorieActive,
        isLoading
    } = useCategoriesStore();

    const stats = useCategoriesStore(state => state.stats);

    // ============================================
    // CHARGEMENT DES CATEGORIES AU MONTAGE
    // ============================================

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // ============================================
    // HANDLERS
    // ============================================

    // Ouvrir la modale d'édition
    const handleEdit = (categorie: Categorie) => {
        setCategorieToEdit(categorie);
        setIsEditModalOpen(true);
    };

    // Supprimer une catégorie
    const handleDelete = async (categorie: Categorie) => {
        const confirmed = window.confirm(
            `Êtes-vous sûr de vouloir supprimer la catégorie "${categorie.nom}" ?\n\n` +
            `Cette action est irréversible. Les articles de cette catégorie ne seront pas supprimés mais n'auront plus de catégorie.`
        );

        if (!confirmed) return;

        try {
            await deleteCategorie(categorie.id);
            alert('Catégorie supprimée avec succès !');
        } catch (error) {
            alert('Erreur lors de la suppression de la catégorie');
        }
    };

    // Activer/Désactiver une catégorie
    const handleToggleActive = async (categorie: Categorie) => {
        try {
            await toggleCategorieActive(categorie.id, !categorie.is_active);
        } catch (error) {
            alert('Erreur lors de la modification du statut');
        }
    };

    const { user, isAuthenticated } = useAuthStore();

    // Bouton actif uniquement si connecté
    const canCreate = isAuthenticated && !isLoading;

    // ============================================
    // RENDU
    // ============================================

    return (
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* En-tête de page */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
                    <p className="text-muted-foreground">
                        Gérer les catégories de produits de la marketplace
                    </p>
                </div>

                {/* Bouton "Ajouter une catégorie" */}
                {/* Désactivé si l'utilisateur n'est pas connecté */}
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={!canCreate}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une catégorie
                </Button>
            </div>

            {/* Cartes de statistiques */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total des catégories</CardDescription>
                        <CardTitle className="text-2xl font-semibold">
                            {stats.total}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Catégories actives</CardDescription>
                        <CardTitle className="text-2xl font-semibold">
                            {stats.actives}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Catégories inactives</CardDescription>
                        <CardTitle className="text-2xl font-semibold">
                            {stats.inactives}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Avec articles</CardDescription>
                        <CardTitle className="text-2xl font-semibold">
                            {stats.avecArticles}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tableau des catégories */}
            <CategoriesTable
                categories={categories}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
            />

            {/* Modale de création */}
            <CreateCategorieModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {/* Modale d'édition */}
            <EditCategorieModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setCategorieToEdit(null);
                }}
                categorie={categorieToEdit}
            />
        </div>
    );
}
