// stores/articlesStore.ts
import { create } from 'zustand';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';

// ============================================
// TYPES
// ============================================

/**
 * Interface représentant un article dans le système
 * Correspond au modèle articles de la base de données Prisma
 */
export interface Article {
    id: string;
    nom: string;
    description: string | null;
    prix: number;
    prix_promotion: number | null;
    is_promotion: boolean;
    pourcentage_reduction: number;
    made_in_gabon: boolean;
    user_id: string;
    categorie_id: string | null;
    image_principale: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Relations optionnelles pour l'affichage
    users?: {
        id: string;
        name: string;
        email: string;
        role: string;
        url_logo: string | null;
    };
    categories?: {
        id: string;
        nom: string;
        slug: string;
    } | null;
    variations?: Variation[];
    image_articles?: ImageArticle[];
    _count?: {
        variations?: number;
        image_articles?: number;
        favoris?: number;
        avis?: number;
        commande_articles?: number;
    };
}

/**
 * Interface pour une variation d'article
 */
export interface Variation {
    id: string;
    article_id: string;
    couleur: string | null;
    taille: string | null;
    stock: number;
    prix: number | null;
    image: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Interface pour une image d'article
 */
export interface ImageArticle {
    id: string;
    url_photo: string;
    variation_id: string | null;
    article_id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Interface pour les données de formulaire de création/modification d'article
 */
export interface ArticleFormData {
    nom: string;
    description?: string | null;
    prix: number;
    prix_promotion?: number | null;
    is_promotion?: boolean;
    pourcentage_reduction?: number;
    made_in_gabon?: boolean;
    user_id?: string; // ID du vendeur/boutique
    categorie_id?: string | null;
    image_principale?: string | null;
    is_active?: boolean;
}

/**
 * Interface pour les statistiques des articles
 */
export interface ArticleStats {
    total: number;
    actifs: number;
    inactifs: number;
    en_promotion: number;
    made_in_gabon: number;
    total_stock: number;
    valeur_totale: number; // Valeur totale du stock en FCFA
    moyenne_prix: number;
}

/**
 * Interface pour les filtres de recherche
 */
export interface ArticleFilters {
    categorie_id?: string;
    user_id?: string;
    is_active?: boolean;
    is_promotion?: boolean;
    made_in_gabon?: boolean;
    search?: string; // Recherche par nom
    prix_min?: number;
    prix_max?: number;
}

/**
 * Interface principale du store
 */
interface ArticlesStore {
    // ========== STATE ==========
    articles: Article[];
    isLoading: boolean;
    error: string | null;
    stats: ArticleStats;
    currentFilters: ArticleFilters;

    // ========== ACTIONS ==========

    /**
     * Récupère tous les articles depuis l'API
     * @param filters - Filtres optionnels
     */
    fetchArticles: (filters?: ArticleFilters) => Promise<void>;

    /**
     * Récupère les statistiques des articles
     */
    fetchStats: () => Promise<void>;

    /**
     * Récupère un article spécifique par son ID
     * @param id - ID de l'article
     */
    fetchArticleById: (id: string) => Promise<Article | null>;

    /**
     * Crée un nouvel article
     * @param data - Données du formulaire
     */
    createArticle: (data: ArticleFormData) => Promise<Article | null>;

    /**
     * Met à jour un article existant
     * @param id - ID de l'article
     * @param data - Données à mettre à jour
     */
    updateArticle: (id: string, data: Partial<ArticleFormData>) => Promise<Article | null>;

    /**
     * Supprime un article
     * @param id - ID de l'article
     */
    deleteArticle: (id: string) => Promise<boolean>;

    /**
     * Active ou désactive un article
     * @param id - ID de l'article
     * @param isActive - Nouveau statut
     */
    toggleArticleActive: (id: string, isActive: boolean) => Promise<boolean>;

    /**
     * Met en promotion ou retire de la promotion
     * @param id - ID de l'article
     * @param isPromotion - Statut promotion
     * @param prixPromotion - Prix promotionnel (optionnel)
     * @param pourcentageReduction - Pourcentage de réduction (optionnel)
     */
    toggleArticlePromotion: (
        id: string,
        isPromotion: boolean,
        prixPromotion?: number,
        pourcentageReduction?: number
    ) => Promise<boolean>;

    /**
     * Met à jour les filtres actifs
     * @param filters - Nouveaux filtres
     */
    setFilters: (filters: ArticleFilters) => void;

    /**
     * Réinitialise les filtres
     */
    resetFilters: () => void;

    /**
     * Réinitialise l'état du store
     */
    reset: () => void;
}

// ============================================
// VALEURS INITIALES
// ============================================

const initialStats: ArticleStats = {
    total: 0,
    actifs: 0,
    inactifs: 0,
    en_promotion: 0,
    made_in_gabon: 0,
    total_stock: 0,
    valeur_totale: 0,
    moyenne_prix: 0,
};

const initialFilters: ArticleFilters = {};

// ============================================
// HELPERS
// ============================================

/**
 * Calcule les statistiques à partir d'une liste d'articles
 */
function computeStats(articles: Article[]): ArticleStats {
    const totalStock = articles.reduce((sum, article) => {
        const stock = article.variations?.reduce((s, v) => s + v.stock, 0) || 0;
        return sum + stock;
    }, 0);

    const valeurTotale = articles.reduce((sum, article) => {
        const stock = article.variations?.reduce((s, v) => s + v.stock, 0) || 0;
        const prix = article.is_promotion && article.prix_promotion
            ? article.prix_promotion
            : article.prix;
        return sum + (stock * prix);
    }, 0);

    const moyennePrix = articles.length > 0
        ? articles.reduce((sum, a) => sum + a.prix, 0) / articles.length
        : 0;

    return {
        total: articles.length,
        actifs: articles.filter(a => a.is_active).length,
        inactifs: articles.filter(a => !a.is_active).length,
        en_promotion: articles.filter(a => a.is_promotion).length,
        made_in_gabon: articles.filter(a => a.made_in_gabon).length,
        total_stock: totalStock,
        valeur_totale: Math.round(valeurTotale),
        moyenne_prix: Math.round(moyennePrix),
    };
}

// ============================================
// CRÉATION DU STORE
// ============================================

export const useArticlesStore = create<ArticlesStore>((set, get) => ({
    // ========== STATE INITIAL ==========
    articles: [],
    isLoading: false,
    error: null,
    stats: initialStats,
    currentFilters: initialFilters,

    // ========== ACTIONS ==========

    /**
     * Récupère tous les articles depuis l'API
     */
    fetchArticles: async (filters) => {
        // console.log('[fetchArticles] Début récupération articles avec filtres:', filters);

        set({ isLoading: true, error: null });

        // Sauvegarder les filtres actuels
        if (filters) {
            set({ currentFilters: filters });
        }

        try {
            const token = useAuthStore.getState().token;

            // Construction de la query string pour les filtres
            const params = new URLSearchParams();
            const activeFilters = filters || get().currentFilters;

            if (activeFilters.categorie_id) params.append('categorie_id', activeFilters.categorie_id);
            if (activeFilters.user_id) params.append('user_id', activeFilters.user_id);
            if (activeFilters.is_active !== undefined) params.append('is_active', String(activeFilters.is_active));
            if (activeFilters.is_promotion !== undefined) params.append('is_promotion', String(activeFilters.is_promotion));
            if (activeFilters.made_in_gabon !== undefined) params.append('made_in_gabon', String(activeFilters.made_in_gabon));
            if (activeFilters.search) params.append('search', activeFilters.search);
            if (activeFilters.prix_min) params.append('prix_min', String(activeFilters.prix_min));
            if (activeFilters.prix_max) params.append('prix_max', String(activeFilters.prix_max));

            const queryString = params.toString();
            const url = queryString
                ? `/api/articles/list?${queryString}`
                : '/api/articles/list';


            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la récupération des articles');
            }

            const data = await response.json();

            // console.log('✅ [fetchArticles] Données reçues:', data.articles?.length || 0, 'articles');

            const articles = data.articles || [];
            const stats = computeStats(articles);

            set({
                articles,
                stats,
                isLoading: false,
            });

        } catch (error) {
            console.error('[fetchArticles] Erreur:', error);

            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

            set({
                error: errorMessage,
                isLoading: false,
                articles: [],
            });

            toast.error('Erreur', {
                description: errorMessage,
            });
        }
    },

    /**
     * Récupère les statistiques des articles
     */
    fetchStats: async () => {
        try {
            const token = useAuthStore.getState().token;

            const response = await fetch('/api/articles/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des statistiques');
            }

            const data = await response.json();

            set({ stats: data.stats });

        } catch (error) {
            console.error('[fetchStats] Erreur:', error);

            // Calculer les stats localement si l'API échoue
            const articles = get().articles;
            const stats = computeStats(articles);
            set({ stats });
        }
    },

    /**
     * Récupère un article spécifique par son ID
     */
    fetchArticleById: async (id: string) => {
        try {
            const token = useAuthStore.getState().token;

            const response = await fetch(`/api/articles/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Article introuvable');
            }

            const data = await response.json();
            return data.article;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error('Erreur', {
                description: errorMessage,
            });
            return null;
        }
    },

    /**
     * Crée un nouvel article
     */
    createArticle: async (data: ArticleFormData) => {
        // console.log('[createArticle] Création article:', data);

        set({ isLoading: true, error: null });

        try {
            const token = useAuthStore.getState().token;

            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la création de l\'article');
            }

            const result = await response.json();
            const newArticle = result.article;

            // Ajouter le nouvel article au state
            const updatedArticles = [newArticle, ...get().articles];
            const stats = computeStats(updatedArticles);

            set({
                articles: updatedArticles,
                stats,
                isLoading: false,
            });

            toast.success('Succès', {
                description: 'Article créé avec succès',
            });

            return newArticle;

        } catch (error) {
            console.error('[createArticle] Erreur:', error);

            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

            set({
                error: errorMessage,
                isLoading: false,
            });

            toast.error('Erreur', {
                description: errorMessage,
            });

            return null;
        }
    },

    /**
     * Met à jour un article existant
     */
    updateArticle: async (id: string, data: Partial<ArticleFormData>) => {
        // console.log('[updateArticle] Mise à jour article:', id, data);

        set({ isLoading: true, error: null });

        try {
            const token = useAuthStore.getState().token;

            const response = await fetch(`/api/articles/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la mise à jour de l\'article');
            }

            const result = await response.json();
            const updatedArticle = result.article;

            // Mettre à jour l'article dans le state
            const updatedArticles = get().articles.map(article =>
                article.id === id ? updatedArticle : article
            );
            const stats = computeStats(updatedArticles);

            set({
                articles: updatedArticles,
                stats,
                isLoading: false,
            });

            toast.success('Succès', {
                description: 'Article mis à jour avec succès',
            });

            return updatedArticle;

        } catch (error) {
            console.error('[updateArticle] Erreur:', error);

            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

            set({
                error: errorMessage,
                isLoading: false,
            });

            toast.error('Erreur', {
                description: errorMessage,
            });

            return null;
        }
    },

    /**
     * Supprime un article
     */
    deleteArticle: async (id: string) => {
        // console.log('[deleteArticle] Suppression article:', id);

        set({ isLoading: true, error: null });

        try {
            const token = useAuthStore.getState().token;

            const response = await fetch(`/api/articles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la suppression de l\'article');
            }

            // Retirer l'article du state
            const remainingArticles = get().articles.filter(article => article.id !== id);
            const stats = computeStats(remainingArticles);

            set({
                articles: remainingArticles,
                stats,
                isLoading: false,
            });

            toast.success('Succès', {
                description: 'Article supprimé avec succès',
            });

            return true;

        } catch (error) {
            console.error('[deleteArticle] Erreur:', error);

            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

            set({
                error: errorMessage,
                isLoading: false,
            });

            toast.error('Erreur', {
                description: errorMessage,
            });

            return false;
        }
    },

    /**
     * Active ou désactive un article
     */
    toggleArticleActive: async (id: string, isActive: boolean) => {
        try {
            const token = useAuthStore.getState().token;

            const response = await fetch(`/api/articles/${id}/toggle-active`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ is_active: isActive }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors du changement de statut');
            }

            const result = await response.json();
            const updatedArticle = result.article;

            // Mettre à jour l'article dans le state
            const updatedArticles = get().articles.map(article =>
                article.id === id ? updatedArticle : article
            );
            const stats = computeStats(updatedArticles);

            set({
                articles: updatedArticles,
                stats,
            });

            toast.success('Succès', {
                description: `Article ${isActive ? 'activé' : 'désactivé'} avec succès`,
            });

            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error('Erreur', {
                description: errorMessage,
            });
            return false;
        }
    },

    /**
     * Met en promotion ou retire de la promotion
     */
    toggleArticlePromotion: async (
        id: string,
        isPromotion: boolean,
        prixPromotion?: number,
        pourcentageReduction?: number
    ) => {
        try {
            const token = useAuthStore.getState().token;

            const response = await fetch(`/api/articles/${id}/toggle-promotion`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    is_promotion: isPromotion,
                    prix_promotion: prixPromotion,
                    pourcentage_reduction: pourcentageReduction,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors du changement de promotion');
            }

            const result = await response.json();
            const updatedArticle = result.article;

            // Mettre à jour l'article dans le state
            const updatedArticles = get().articles.map(article =>
                article.id === id ? updatedArticle : article
            );
            const stats = computeStats(updatedArticles);

            set({
                articles: updatedArticles,
                stats,
            });

            toast.success('Succès', {
                description: `Article ${isPromotion ? 'mis en promotion' : 'retiré de la promotion'} avec succès`,
            });

            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error('Erreur', {
                description: errorMessage,
            });
            return false;
        }
    },

    /**
     * Met à jour les filtres actifs
     */
    setFilters: (filters: ArticleFilters) => {
        // console.log('[setFilters] Nouveaux filtres:', filters);
        set({ currentFilters: filters });
    },

    /**
     * Réinitialise les filtres
     */
    resetFilters: () => {
        // console.log('[resetFilters] Réinitialisation des filtres');
        set({ currentFilters: initialFilters });
        get().fetchArticles();
    },

    /**
     * Réinitialise l'état du store
     */
    reset: () => {
        console.log('[articlesStore] Reset');
        set({
            articles: [],
            isLoading: false,
            error: null,
            stats: initialStats,
            currentFilters: initialFilters,
        });
    },
}));