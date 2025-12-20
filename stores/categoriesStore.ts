// stores/categoriesStore.ts
/**
 * CategoriesStore - Store pour gérer les catégories de produits
 * 
 * Fonctionnalités :
 * - Lister toutes les catégories (avec hiérarchie parent/enfant)
 * - Créer une nouvelle catégorie
 * - Modifier une catégorie existante
 * - Supprimer une catégorie
 * - Activer/Désactiver une catégorie
 * - Gérer l'ordre d'affichage
 * - Récupérer l'arbre hiérarchique des catégories
 */

import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

/**
 * Interface Categorie complète
 * Correspond exactement à votre schéma Prisma
 */
export interface Categorie {
    id: string;
    nom: string;
    slug: string;
    description: string | null;
    image: string | null;
    parent_id: string | null;
    is_active: boolean;
    ordre: number;
    created_at: string;
    updated_at: string;

    // Relations (optionnelles, chargées selon les besoins)
    parent?: Categorie;
    children?: Categorie[];
    articles?: any[]; // On ne charge généralement pas les articles avec les catégories
    _count?: {
        articles?: number;
        children?: number;
    };
}

/**
 * Type pour créer une nouvelle catégorie
 * On omet les champs auto-générés (id, dates, etc.)
 */
export interface CreateCategorieInput {
    nom: string;
    slug?: string; // Optionnel, sera généré automatiquement si non fourni
    description?: string;
    image?: string;
    parent_id?: string | null;
    is_active?: boolean;
    ordre?: number;
}

/**
 * Type pour mettre à jour une catégorie
 * Tous les champs sont optionnels
 */
export interface UpdateCategorieInput {
    nom?: string;
    slug?: string;
    description?: string;
    image?: string;
    parent_id?: string | null;
    is_active?: boolean;
    ordre?: number;
}

/**
 * État de chargement
 */
interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

/**
 * Nœud d'arbre de catégories
 * Utilisé pour afficher la hiérarchie
 */
export interface CategorieTreeNode extends Categorie {
    children: CategorieTreeNode[];
    level: number; // Niveau de profondeur (0 = racine)
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface CategoriesState extends LoadingState {
    // -------- ÉTAT --------

    /**
     * Liste de toutes les catégories (plate)
     */
    categories: Categorie[];

    /**
     * Arbre hiérarchique des catégories
     * Pratique pour l'affichage en arborescence
     */
    categoriesTree: CategorieTreeNode[];

    /**
     * Catégorie actuellement sélectionnée
     * Pour l'édition ou l'affichage des détails
     */
    selectedCategorie: Categorie | null;

    /**
     * Statistiques
     */
    stats: {
        total: number;
        actives: number;
        inactives: number;
        avecArticles: number;
    };

    // -------- ACTIONS --------

    /**
     * Récupère toutes les catégories
     */
    fetchCategories: () => Promise<void>;

    /**
     * Récupère l'arbre des catégories
     */
    fetchCategoriesTree: () => Promise<void>;

    /**
     * Récupère une catégorie par ID
     */
    fetchCategorieById: (id: string) => Promise<void>;

    /**
     * Crée une nouvelle catégorie
     */
    createCategorie: (data: CreateCategorieInput) => Promise<Categorie>;

    /**
     * Met à jour une catégorie
     */
    updateCategorie: (id: string, data: UpdateCategorieInput) => Promise<Categorie>;

    /**
     * Supprime une catégorie
     */
    deleteCategorie: (id: string) => Promise<void>;

    /**
     * Active ou désactive une catégorie
     */
    toggleCategorieActive: (id: string, isActive: boolean) => Promise<void>;

    /**
     * Sélectionne une catégorie
     */
    setSelectedCategorie: (categorie: Categorie | null) => void;

    /**
     * Efface les erreurs
     */
    clearError: () => void;

    /**
     * Calcule les statistiques
     */
    calculateStats: () => void;

    /**
     * Rafraîchit les données
     */
    refresh: () => Promise<void>;

    // -------- SÉLECTEURS UTILITAIRES DANS LE STORE --------
    /**
     * Récupère uniquement les catégories actives
     */
    categoriesActives: () => Categorie[];

    /**
     * Récupère uniquement les catégories racines (sans parent)
     */
    categoriesRacines: () => Categorie[];

    /**
     * Récupère les enfants d'une catégorie
     */
    categorieChildren: (parentId: string) => Categorie[];
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Génère un slug à partir d'un nom
 * Exemple : "Électronique & High-Tech" → "electronique-high-tech"
 */
function generateSlug(nom: string): string {
    return nom
        .toLowerCase()
        .normalize('NFD') // Décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères spéciaux par des tirets
        .replace(/^-+|-+$/g, ''); // Supprime les tirets au début et à la fin
}

/**
 * Construit un arbre hiérarchique à partir d'une liste plate de catégories
 */
function buildTree(categories: Categorie[]): CategorieTreeNode[] {
    const map = new Map<string, CategorieTreeNode>();
    const roots: CategorieTreeNode[] = [];

    // Créer tous les nœuds
    categories.forEach(cat => {
        map.set(cat.id, {
            ...cat,
            children: [],
            level: 0,
        });
    });

    // Construire l'arbre
    categories.forEach(cat => {
        const node = map.get(cat.id)!;

        if (cat.parent_id && map.has(cat.parent_id)) {
            // Ajouter comme enfant
            const parent = map.get(cat.parent_id)!;
            node.level = parent.level + 1;
            parent.children.push(node);
        } else {
            // C'est une racine
            roots.push(node);
        }
    });

    // Trier par ordre
    const sortByOrdre = (a: CategorieTreeNode, b: CategorieTreeNode) => a.ordre - b.ordre;
    roots.sort(sortByOrdre);
    roots.forEach(root => sortChildren(root));

    return roots;
}

/**
 * Trie récursivement les enfants d'un nœud
 */
function sortChildren(node: CategorieTreeNode) {
    node.children.sort((a, b) => a.ordre - b.ordre);
    node.children.forEach(child => sortChildren(child));
}

// ============================================
// CRÉATION DU STORE
// ============================================

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
    // -------- ÉTAT INITIAL --------
    categories: [],
    categoriesTree: [],
    selectedCategorie: null,
    isLoading: false,
    error: null,

    stats: {
        total: 0,
        actives: 0,
        inactives: 0,
        avecArticles: 0,
    },

    // -------- ACTIONS --------
    fetchCategories: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch('/api/categories/list');

            if (!response.ok) throw new Error('Erreur lors du chargement des catégories');

            const data: { categories: Categorie[]; total: number } = await response.json();

            set({
                categories: data.categories,
                categoriesTree: buildTree(data.categories),
                isLoading: false,
                error: null,
            });

            get().calculateStats();
        } catch (error) {
            console.error('fetchCategories error:', error);
            set({
                error: error instanceof Error ? error.message : 'Erreur de chargement',
                isLoading: false,
            });
        }
    },



    fetchCategoriesTree: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/categories/tree');
            if (!response.ok) throw new Error('Erreur lors du chargement de l\'arbre');
            const data = await response.json();
            set({ categoriesTree: data, isLoading: false, error: null });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Erreur', isLoading: false });
        }
    },

    fetchCategorieById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/categories/${id}`);
            if (!response.ok) throw new Error('Catégorie introuvable');
            const categorie: Categorie = await response.json();
            set({ selectedCategorie: categorie, isLoading: false, error: null });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Erreur', isLoading: false, selectedCategorie: null });
        }
    },

    createCategorie: async (data: CreateCategorieInput) => {
        set({ isLoading: true, error: null });
        try {
            const categorieData = {
                ...data,
                slug: data.slug || generateSlug(data.nom),
                is_active: data.is_active ?? true,
                ordre: data.ordre ?? 0,
            };

            const response = await fetch('/api/categories/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categorieData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la création');
            }

            const nouvelleCategorie: Categorie = await response.json();
            const nouvellesCategories = [...get().categories, nouvelleCategorie];

            set({ categories: nouvellesCategories, isLoading: false, error: null });
            set({ categoriesTree: buildTree(nouvellesCategories) });
            get().calculateStats();

            return nouvelleCategorie;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Erreur', isLoading: false });
            throw error;
        }
    },

    updateCategorie: async (id: string, data: UpdateCategorieInput) => {
        set({ isLoading: true, error: null });
        try {
            const updateData = { ...data };
            if (data.nom && !data.slug) updateData.slug = generateSlug(data.nom);

            const response = await fetch(`/api/categories/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la mise à jour');
            }

            const categorieMiseAJour: Categorie = await response.json();
            const nouvellesCategories = get().categories.map(cat => cat.id === id ? categorieMiseAJour : cat);
            const newSelectedCategorie = get().selectedCategorie?.id === id ? categorieMiseAJour : get().selectedCategorie;

            set({ categories: nouvellesCategories, selectedCategorie: newSelectedCategorie, isLoading: false, error: null });
            set({ categoriesTree: buildTree(nouvellesCategories) });

            return categorieMiseAJour;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Erreur', isLoading: false });
            throw error;
        }
    },

    deleteCategorie: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la suppression');
            }

            const nouvellesCategories = get().categories.filter(cat => cat.id !== id);
            const newSelectedCategorie = get().selectedCategorie?.id === id ? null : get().selectedCategorie;

            set({ categories: nouvellesCategories, selectedCategorie: newSelectedCategorie, isLoading: false, error: null });
            set({ categoriesTree: buildTree(nouvellesCategories) });
            get().calculateStats();
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Erreur', isLoading: false });
            throw error;
        }
    },

    toggleCategorieActive: async (id: string, isActive: boolean) => {
        set({ isLoading: true, error: null });
        try {
            await get().updateCategorie(id, { is_active: isActive });
        } catch (error) {
            throw error;
        }
    },

    setSelectedCategorie: (categorie: Categorie | null) => { set({ selectedCategorie: categorie }); },
    clearError: () => { set({ error: null }); },

    calculateStats: () => {
        const categories = get().categories;
        const stats = {
            total: categories.length,
            actives: categories.filter(cat => cat.is_active).length,
            inactives: categories.filter(cat => !cat.is_active).length,
            avecArticles: categories.filter(cat => cat._count?.articles && cat._count.articles > 0).length,
        };
        set({ stats });
    },

    refresh: async () => { await get().fetchCategories(); },

    // ============================================
    // SÉLECTEURS UTILITAIRES DANS LE STORE
    // ============================================

    /**
     * Récupère uniquement les catégories actives
     */
    categoriesActives: () => get().categories.filter(cat => cat.is_active),

    /**
     * Récupère uniquement les catégories racines (sans parent)
     */
    categoriesRacines: () => {
        const cats = Array.isArray(get().categories) ? get().categories : [];
        return cats.filter(cat => !cat.parent_id);
    },



    /**
     * Récupère les enfants d'une catégorie
     */
    categorieChildren: (parentId: string) => get().categories.filter(cat => cat.parent_id === parentId),
}));
