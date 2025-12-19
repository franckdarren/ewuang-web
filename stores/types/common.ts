// stores/types/common.ts
// Ce fichier contient tous les types TypeScript communs utilisés dans nos stores
// Pourquoi créer ce fichier ? Pour éviter de répéter les mêmes définitions partout
// et avoir une source unique de vérité pour nos types

/**
 * Type pour gérer l'état de chargement et les erreurs
 * C'est un pattern très courant : quand on fait un appel API,
 * on a besoin de savoir si on est en train de charger (isLoading)
 * et s'il y a eu une erreur (error)
 */
export interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

/**
 * Type générique pour les réponses paginées
 * Beaucoup de vos routes API retournent des listes paginées
 * Ce type nous permet de gérer cela de manière uniforme
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

/**
 * Paramètres de pagination pour les requêtes
 * Utilisé quand on veut récupérer une liste avec pagination
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
}

/**
 * Type pour les filtres de recherche
 * Permet de filtrer les résultats selon différents critères
 */
export interface SearchFilters {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    [key: string]: any; // Permet d'ajouter d'autres filtres personnalisés
}

// ============================================
// TYPES POUR LES ENTITÉS DE LA BASE DE DONNÉES
// Ces types correspondent exactement à votre schéma Prisma
// ============================================

/**
 * Énumération des statuts de commande
 * Correspond à l'enum commandes_statut de votre base de données
 */
export enum CommandeStatut {
    EN_ATTENTE = 'en_attente',
    EN_PREPARATION = 'en_preparation',
    PRETE_POUR_LIVRAISON = 'prete_pour_livraison',
    EN_COURS_DE_LIVRAISON = 'en_cours_de_livraison',
    LIVREE = 'livree',
    ANNULE = 'annule',
    REMBOURSE = 'rembourse',
}

/**
 * Type pour une commande complète
 * Inclut toutes les relations importantes
 */
export interface Commande {
    id: string;
    numero: string;
    statut: CommandeStatut;
    prix: number;
    commentaire: string;
    isLivrable: boolean;
    user_id: string;
    vendeur_id: string | null;
    paiement_id: string | null;
    adresse_livraison: string;
    created_at: string;
    updated_at: string;

    // Relations (optionnelles car pas toujours chargées)
    acheteur?: User;
    vendeur?: User;
    articles?: ArticleCommande[];
    livraison?: Livraison;
    paiement?: Paiement;
}

/**
 * Type pour un article dans une commande
 */
export interface ArticleCommande {
    id: string;
    commande_id: string;
    article_id: string;
    variation_id: string | null;
    quantite: number;
    prix_unitaire: number;
    created_at: string;

    // Relations
    article?: Article;
    variation?: Variation;
}

/**
 * Type pour un article
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

    // Relations
    user?: User;
    categorie?: Categorie;
    variations?: Variation[];
    images?: ImageArticle[];
}

/**
 * Type pour une variation de produit (couleur, taille, etc.)
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
 * Type pour une image d'article
 */
export interface ImageArticle {
    id: string;
    url_photo: string;
    article_id: string;
    variation_id: string | null;
    created_at: string;
}

/**
 * Type pour un utilisateur
 * Correspond aux trois rôles : Client, Boutique, Livreur
 */
export interface User {
    id: string;
    auth_id: string | null;
    name: string;
    role: 'client' | 'boutique' | 'livreur' | 'admin';
    email: string;
    url_logo: string | null;
    phone: string | null;
    heure_ouverture: string | null;
    heure_fermeture: string | null;
    description: string | null;
    address: string | null;
    solde: number;
    is_verified: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Énumération des statuts de livraison
 */
export enum LivraisonStatut {
    EN_ATTENTE = 'en_attente',
    ATTRIBUEE = 'attribuee',
    EN_COURS = 'en_cours',
    LIVREE = 'livree',
    ANNULEE = 'annulee',
}

/**
 * Type pour une livraison
 */
export interface Livraison {
    id: string;
    adresse: string;
    details: string;
    statut: string;
    date_livraison: string;
    ville: string;
    phone: string;
    commande_id: string;
    user_id: string | null;
    livreur_id: string | null;
    created_at: string;
    updated_at: string;

    // Relations
    commande?: Commande;
    user?: User;
    livreur?: User;
}

/**
 * Énumération des statuts de réclamation
 */
export enum ReclamationStatut {
    EN_ATTENTE = 'en_attente_de_traitement',
    EN_COURS = 'en_cours',
    REJETE = 'rejete',
    REMBOURSE = 'rembourse',
}

/**
 * Type pour une réclamation
 */
export interface Reclamation {
    id: string;
    description: string;
    phone: string;
    statut: ReclamationStatut;
    commande_id: string;
    user_id: string;
    reponse: string | null;
    created_at: string;
    updated_at: string;

    // Relations
    commande?: Commande;
    user?: User;
}

/**
 * Type pour une catégorie
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

    // Relations
    parent?: Categorie;
    children?: Categorie[];
    articles?: Article[];
}

/**
 * Énumération des statuts de paiement
 */
export enum PaiementStatut {
    EN_ATTENTE = 'en_attente',
    VALIDE = 'valide',
    ECHOUE = 'echoue',
    REMBOURSE = 'rembourse',
}

/**
 * Type pour un paiement
 */
export interface Paiement {
    id: string;
    user_id: string;
    montant: number;
    methode: string;
    statut: PaiementStatut;
    reference: string;
    transaction_id: string | null;
    details: any;
    created_at: string;
    updated_at: string;

    // Relations
    user?: User;
    commande?: Commande;
}

/**
 * Type pour une publicité
 */
export interface Publicite {
    id: string;
    date_start: string;
    date_end: string;
    titre: string;
    url_image: string;
    lien: string;
    description: string;
    is_actif: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Type pour une notification
 */
export interface Notification {
    id: string;
    user_id: string;
    type: 'commande' | 'livraison' | 'message' | 'promotion' | 'alerte_stock' | 'avis' | 'systeme';
    titre: string;
    message: string;
    lien: string | null;
    is_read: boolean;
    created_at: string;
}

/**
 * Type pour les statistiques du dashboard
 * Ces données seront calculées côté serveur
 */
export interface DashboardStats {
    // Statistiques des commandes
    totalCommandes: number;
    commandesEnAttente: number;
    commandesLivrees: number;
    revenusTotal: number;
    revenusAujourdhui: number;
    revenusMoisCourant: number;

    // Statistiques des utilisateurs
    totalUtilisateurs: number;
    nouveauxUtilisateurs: number;
    totalBoutiques: number;
    totalClients: number;
    totalLivreurs: number;

    // Statistiques des articles
    totalArticles: number;
    articlesActifs: number;
    articlesEnPromotion: number;
    articlesStockFaible: number;

    // Statistiques des livraisons
    livraisonsEnCours: number;
    livraisonsTerminees: number;

    // Statistiques des réclamations
    reclamationsEnAttente: number;
    reclamationsResolues: number;

    // Graphiques (données pour les charts)
    commandesParJour: { date: string; count: number; montant: number }[];
    commandesParStatut: { statut: string; count: number }[];
    topArticles: { article: Article; ventes: number }[];
    topBoutiques: { boutique: User; ventes: number }[];
}