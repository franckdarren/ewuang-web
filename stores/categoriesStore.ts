// stores/categoriesStore.ts
/**
 * CategoriesStore - Store pour gérer les catégories de produits
 * 
 * 🔒 SÉCURITÉ :
 * - Toutes les opérations nécessitent un token Bearer
 * - L'utilisateur doit avoir le rôle "Administrateur"
 * - Le token est récupéré automatiquement depuis authStore
 */

import { create } from 'zustand';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

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

    parent?: Categorie;
    children?: Categorie[];
    articles?: any[];
    _count?: {
        articles?: number;
        children?: number;
    };
}

export interface CreateCategorieInput {
    nom: string;
    slug?: string;
    description?: string;
    image?: string;
    parent_id?: string | null;
    is_active?: boolean;
    ordre?: number;
}

export interface UpdateCategorieInput {
    nom?: string;
    slug?: string;
    description?: string;
    image?: string;
    parent_id?: string | null;
    is_active?: boolean;
    ordre?: number;
}

interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

export interface CategorieTreeNode extends Categorie {
    children: CategorieTreeNode[];
    level: number;
}

// ============================================
// INTERFACE DU STORE
// ============================================

interface CategoriesState extends LoadingState {
    categories: Categorie[];
    categoriesTree: CategorieTreeNode[];
    selectedCategorie: Categorie | null;

    stats: {
        total: number;
        actives: number;
        inactives: number;
        avecArticles: number;
    };

    // Ajout d'une propriété calculée pour les catégories racines
    categoriesRacines: () => Categorie[];

    fetchCategories: () => Promise<void>;
    fetchCategoriesTree: () => Promise<void>;
    fetchCategorieById: (id: string) => Promise<void>;
    createCategorie: (data: CreateCategorieInput) => Promise<Categorie>;
    updateCategorie: (id: string, data: UpdateCategorieInput) => Promise<Categorie>;
    deleteCategorie: (id: string) => Promise<void>;
    toggleCategorieActive: (id: string, isActive: boolean) => Promise<void>;
    setSelectedCategorie: (categorie: Categorie | null) => void;
    clearError: () => void;
    calculateStats: () => void;
    refresh: () => Promise<void>;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Récupère le token d'authentification
 */
function getAuthToken(): string {
    const token = useAuthStore.getState().token;

    if (!token) {
        throw new Error('Non authentifié. Veuillez vous connecter.');
    }

    return token;
}

/**
 * Vérifie le rôle administrateur
 */
function checkAdminRole(): void {
    const user = useAuthStore.getState().user;

    if (!user) {
        throw new Error('Non authentifié. Veuillez vous connecter.');
    }

    // Vérifier le rôle (avec votre vraie valeur "Administrateur")
    if (user.role !== 'Administrateur') {
        throw new Error(
            `Accès refusé. Cette action nécessite les privilèges administrateur. Votre rôle actuel : ${user.role}`
        );
    }
}

/**
 * Crée les headers HTTP avec authentification
 */
function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

/**
 * Génère un slug
 */
function generateSlug(nom: string): string {
    return nom
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Construit un arbre hiérarchique
 */
function buildTree(categories: Categorie[]): CategorieTreeNode[] {
    const map = new Map<string, CategorieTreeNode>();
    const roots: CategorieTreeNode[] = [];

    categories.forEach(cat => {
        map.set(cat.id, {
            ...cat,
            children: [],
            level: 0,
        });
    });

    categories.forEach(cat => {
        const node = map.get(cat.id)!;

        if (cat.parent_id && map.has(cat.parent_id)) {
            const parent = map.get(cat.parent_id)!;
            node.level = parent.level + 1;
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortByOrdre = (a: CategorieTreeNode, b: CategorieTreeNode) => a.ordre - b.ordre;
    roots.sort(sortByOrdre);
    roots.forEach(root => sortChildren(root));

    return roots;
}

function sortChildren(node: CategorieTreeNode) {
    node.children.sort((a, b) => a.ordre - b.ordre);
    node.children.forEach(child => sortChildren(child));
}

/**
 * Gère les erreurs API
 */
async function handleApiError(response: Response): Promise<never> {
    let errorMessage = 'Une erreur est survenue';

    try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
        switch (response.status) {
            case 401:
                errorMessage = 'Non authentifié. Veuillez vous reconnecter.';
                break;
            case 403:
                errorMessage = 'Accès refusé. Privilèges administrateur requis.';
                break;
            case 404:
                errorMessage = 'Ressource introuvable.';
                break;
            case 500:
                errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
                break;
        }
    }

    throw new Error(errorMessage);
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

    // -------- PROPRIÉTÉ CALCULÉE --------

    /**
     * Retourne les catégories racines (sans parent)
     */
    categoriesRacines: () => {
        return get().categories.filter(cat => !cat.parent_id);
    },

    // -------- ACTIONS --------

    /**
     * FETCH CATEGORIES - Récupérer toutes les catégories
     */
    fetchCategories: async () => {
        set({ isLoading: true, error: null });

        try {
            const token = getAuthToken();

            const response = await fetch('/api/categories/list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();

            // IMPORTANT : Votre API retourne { categories: [...] }
            const categories: Categorie[] = data.categories || data;

            set({
                categories,
                isLoading: false,
                error: null,
            });

            const tree = buildTree(categories);
            set({ categoriesTree: tree });
            get().calculateStats();

            console.log(`✅ ${categories.length} catégories chargées`);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur fetchCategories:', errorMessage);

            if (errorMessage.includes('authentifié')) {
                useAuthStore.getState().logout();
            }
        }
    },

    /**
     * FETCH CATEGORIES TREE
     */
    fetchCategoriesTree: async () => {
        set({ isLoading: true, error: null });

        try {
            const token = getAuthToken();

            const response = await fetch('/api/categories/tree', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();

            set({
                categoriesTree: data,
                isLoading: false,
                error: null,
            });

            console.log('✅ Arbre des catégories chargé');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement';

            set({
                error: errorMessage,
                isLoading: false,
            });
        }
    },

    /**
     * FETCH CATEGORIE BY ID
     */
    fetchCategorieById: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            const token = getAuthToken();

            const response = await fetch(`/api/categories/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const data = await response.json();

            // IMPORTANT : Votre API retourne { category: {...} }
            const categorie: Categorie = data.category || data;

            set({
                selectedCategorie: categorie,
                isLoading: false,
                error: null,
            });

            console.log('✅ Catégorie chargée:', categorie.nom);

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de chargement';

            set({
                error: errorMessage,
                isLoading: false,
                selectedCategorie: null,
            });
        }
    },

    /**
     * CREATE CATEGORIE - Créer une nouvelle catégorie
     */
    createCategorie: async (data: CreateCategorieInput) => {
        set({ isLoading: true, error: null });

        try {
            // Vérifier le rôle
            checkAdminRole();

            // Préparer les données
            const categorieData = {
                nom: data.nom.trim(),
                slug: data.slug?.trim() || undefined,
                description: data.description?.trim() || undefined,
                image: data.image?.trim() || undefined,
                parent_id: data.parent_id || undefined,
                is_active: data.is_active ?? true,
                ordre: data.ordre ?? 0,
            };

            console.log('📤 Envoi des données:', categorieData);
            console.log('🔑 Token présent:', !!getAuthToken());
            console.log('👤 Utilisateur:', useAuthStore.getState().user);

            const response = await fetch('/api/categories/create', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(categorieData),
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const responseData = await response.json();

            // IMPORTANT : Votre API retourne { category: {...} }
            const nouvelleCategorie: Categorie = responseData.category || responseData;

            const nouvellesCategories = [...get().categories, nouvelleCategorie];
            set({
                categories: nouvellesCategories,
                isLoading: false,
                error: null,
            });

            const tree = buildTree(nouvellesCategories);
            set({ categoriesTree: tree });
            get().calculateStats();

            console.log('✅ Catégorie créée:', nouvelleCategorie.nom);

            return nouvelleCategorie;

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de création';

            set({
                error: errorMessage,
                isLoading: false,
            });

            console.error('❌ Erreur createCategorie:', errorMessage);
            throw error;
        }
    },

    /**
     * UPDATE CATEGORIE - Mettre à jour une catégorie
     */
    updateCategorie: async (id: string, data: UpdateCategorieInput) => {
        set({ isLoading: true, error: null });

        try {
            checkAdminRole();

            const updateData = { ...data };
            if (data.nom && !data.slug) {
                updateData.slug = generateSlug(data.nom);
            }

            const response = await fetch(`/api/categories/update/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const responseData = await response.json();
            const categorieMiseAJour: Categorie = responseData.category || responseData;

            const nouvellesCategories = get().categories.map(cat =>
                cat.id === id ? categorieMiseAJour : cat
            );

            const selectedCategorie = get().selectedCategorie;
            const newSelectedCategorie = selectedCategorie?.id === id
                ? categorieMiseAJour
                : selectedCategorie;

            set({
                categories: nouvellesCategories,
                selectedCategorie: newSelectedCategorie,
                isLoading: false,
                error: null,
            });

            const tree = buildTree(nouvellesCategories);
            set({ categoriesTree: tree });

            console.log('✅ Catégorie mise à jour:', categorieMiseAJour.nom);

            return categorieMiseAJour;

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de mise à jour';

            set({
                error: errorMessage,
                isLoading: false,
            });

            throw error;
        }
    },

    /**
     * DELETE CATEGORIE - Supprimer une catégorie
     */
    deleteCategorie: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
            checkAdminRole();

            const response = await fetch(`/api/categories/delete/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                await handleApiError(response);
            }

            const nouvellesCategories = get().categories.filter(cat => cat.id !== id);

            const selectedCategorie = get().selectedCategorie;
            const newSelectedCategorie = selectedCategorie?.id === id
                ? null
                : selectedCategorie;

            set({
                categories: nouvellesCategories,
                selectedCategorie: newSelectedCategorie,
                isLoading: false,
                error: null,
            });

            const tree = buildTree(nouvellesCategories);
            set({ categoriesTree: tree });
            get().calculateStats();

            console.log('✅ Catégorie supprimée');

        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Erreur de suppression';

            set({
                error: errorMessage,
                isLoading: false,
            });

            throw error;
        }
    },

    /**
     * TOGGLE CATEGORIE ACTIVE
     */
    toggleCategorieActive: async (id: string, isActive: boolean) => {
        try {
            await get().updateCategorie(id, { is_active: isActive });
            console.log(`✅ Catégorie ${isActive ? 'activée' : 'désactivée'}`);
        } catch (error) {
            throw error;
        }
    },

    setSelectedCategorie: (categorie: Categorie | null) => {
        set({ selectedCategorie: categorie });
    },

    clearError: () => {
        set({ error: null });
    },

    calculateStats: () => {
        const categories = get().categories;

        const stats = {
            total: categories.length,
            actives: categories.filter(cat => cat.is_active).length,
            inactives: categories.filter(cat => !cat.is_active).length,
            avecArticles: categories.filter(cat =>
                cat._count && cat._count.articles && cat._count.articles > 0
            ).length,
        };

        set({ stats });
    },

    refresh: async () => {
        await get().fetchCategories();
    },
}));

// ============================================
// SÉLECTEURS UTILITAIRES
// ============================================

/**
 * IMPORTANT : Ces sélecteurs utilisent une référence stable
 * pour éviter les re-renders infinis
 */

export const useCategoriesActives = () => {
    return useCategoriesStore((state) => {
        // Créer une référence stable en utilisant l'ID du premier élément
        const ids = state.categories.filter(cat => cat.is_active).map(c => c.id).join(',');
        return state.categories.filter(cat => cat.is_active);
    }, (a, b) => {
        // Comparateur personnalisé pour éviter les re-renders inutiles
        return a.length === b.length && a.every((cat, i) => cat.id === b[i]?.id);
    });
};

export const useCategoriesRacines = () => {
    return useCategoriesStore((state) => {
        // Filtrer les catégories racines
        return state.categories.filter(cat => !cat.parent_id);
    }, (a, b) => {
        // Comparateur : éviter re-render si la liste n'a pas changé
        if (a.length !== b.length) return false;
        return a.every((cat, i) => cat.id === b[i]?.id);
    });
};

export const useCategorieChildren = (parentId: string) => {
    return useCategoriesStore((state) =>
        state.categories.filter(cat => cat.parent_id === parentId),
        (a, b) => {
            if (a.length !== b.length) return false;
            return a.every((cat, i) => cat.id === b[i]?.id);
        }
    );
};

export const useCategoriesLoading = () => {
    return useCategoriesStore((state) => state.isLoading);
};

export const useCategoriesError = () => {
    return useCategoriesStore((state) => state.error);
};

export const useCategoriesStats = () => {
    return useCategoriesStore((state) => state.stats);
};