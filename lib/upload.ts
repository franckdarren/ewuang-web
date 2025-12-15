/**
 * lib/upload.ts
 * 
 * Helpers pour l'upload et la gestion des images avec Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880'); // 5 MB
const ALLOWED_TYPES = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || '80');
const MAX_WIDTH = parseInt(process.env.MAX_WIDTH || '1920');
const MAX_HEIGHT = parseInt(process.env.MAX_HEIGHT || '1920');

/**
 * Interface pour le résultat de l'upload
 */
export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

/**
 * Valide un fichier image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Vérifier le type MIME
    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Type de fichier non autorisé. Types acceptés : ${ALLOWED_TYPES.join(', ')}`
        };
    }

    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Fichier trop volumineux. Taille max : ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)} MB`
        };
    }

    return { valid: true };
}

/**
 * Optimise une image avec Sharp
 * - Redimensionne si nécessaire
 * - Convertit en WebP
 * - Compresse
 */
export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
        const optimized = await sharp(buffer)
            .resize(MAX_WIDTH, MAX_HEIGHT, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: IMAGE_QUALITY })
            .toBuffer();

        return optimized;
    } catch (error) {
        console.error('Erreur optimisation image:', error);
        throw new Error('Erreur lors de l\'optimisation de l\'image');
    }
}

/**
 * Upload une image d'article principale
 */
export async function uploadArticleImage(
    file: File,
    userId: string,
    articleId: string,
    type: 'principale' | 'gallery' = 'principale',
    index?: number
): Promise<UploadResult> {
    try {
        // Validation
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Convertir File en Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Optimiser l'image
        const optimizedBuffer = await optimizeImage(buffer);

        // Générer le nom de fichier
        const fileName = type === 'principale'
            ? 'principale.webp'
            : `gallery-${index || Date.now()}.webp`;

        // Chemin dans le bucket
        const filePath = `${userId}/${articleId}/${fileName}`;

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
            .from('articles-images')
            .upload(filePath, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: true // Remplacer si existe déjà
            });

        if (error) {
            console.error('Erreur upload Supabase:', error);
            return { success: false, error: error.message };
        }

        // Générer l'URL publique
        const { data: urlData } = supabase.storage
            .from('articles-images')
            .getPublicUrl(filePath);

        return {
            success: true,
            url: urlData.publicUrl,
            path: filePath
        };

    } catch (error: any) {
        console.error('Erreur upload article image:', error);
        return {
            success: false,
            error: error.message || 'Erreur lors de l\'upload'
        };
    }
}

/**
 * Upload une image de variation
 */
export async function uploadVariationImage(
    file: File,
    userId: string,
    variationId: string
): Promise<UploadResult> {
    try {
        // Validation
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Convertir File en Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Optimiser l'image
        const optimizedBuffer = await optimizeImage(buffer);

        // Chemin dans le bucket
        const filePath = `${userId}/${variationId}/image.webp`;

        // Upload vers Supabase Storage
        const { data, error } = await supabase.storage
            .from('variations-images')
            .upload(filePath, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (error) {
            console.error('Erreur upload Supabase:', error);
            return { success: false, error: error.message };
        }

        // Générer l'URL publique
        const { data: urlData } = supabase.storage
            .from('variations-images')
            .getPublicUrl(filePath);

        return {
            success: true,
            url: urlData.publicUrl,
            path: filePath
        };

    } catch (error: any) {
        console.error('Erreur upload variation image:', error);
        return {
            success: false,
            error: error.message || 'Erreur lors de l\'upload'
        };
    }
}

/**
 * Upload multiple images (galerie article)
 */
export async function uploadMultipleImages(
    files: File[],
    userId: string,
    articleId: string
): Promise<{ success: boolean; results: UploadResult[]; error?: string }> {
    try {
        if (files.length === 0) {
            return { success: false, results: [], error: 'Aucun fichier fourni' };
        }

        if (files.length > 10) {
            return { success: false, results: [], error: 'Maximum 10 images autorisées' };
        }

        const uploadPromises = files.map((file, index) =>
            uploadArticleImage(file, userId, articleId, 'gallery', index + 1)
        );

        const results = await Promise.all(uploadPromises);

        const allSuccess = results.every(r => r.success);

        return {
            success: allSuccess,
            results,
            error: allSuccess ? undefined : 'Certaines images n\'ont pas pu être uploadées'
        };

    } catch (error: any) {
        return {
            success: false,
            results: [],
            error: error.message || 'Erreur lors de l\'upload multiple'
        };
    }
}

/**
 * Supprime une image du storage
 */
export async function deleteImage(
    bucket: 'articles-images' | 'variations-images',
    filePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error('Erreur suppression image:', error);
            return { success: false, error: error.message };
        }

        return { success: true };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erreur lors de la suppression'
        };
    }
}

/**
 * Supprime toutes les images d'un article
 */
export async function deleteArticleImages(
    userId: string,
    articleId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Lister tous les fichiers de l'article
        const { data: files, error: listError } = await supabase.storage
            .from('articles-images')
            .list(`${userId}/${articleId}`);

        if (listError) {
            return { success: false, error: listError.message };
        }

        if (!files || files.length === 0) {
            return { success: true }; // Aucune image à supprimer
        }

        // Supprimer tous les fichiers
        const filePaths = files.map(file => `${userId}/${articleId}/${file.name}`);

        const { error: deleteError } = await supabase.storage
            .from('articles-images')
            .remove(filePaths);

        if (deleteError) {
            return { success: false, error: deleteError.message };
        }

        return { success: true };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erreur lors de la suppression des images'
        };
    }
}

/**
 * Récupère la liste des images d'un article
 */
export async function listArticleImages(
    userId: string,
    articleId: string
): Promise<{ success: boolean; images?: string[]; error?: string }> {
    try {
        const { data: files, error } = await supabase.storage
            .from('articles-images')
            .list(`${userId}/${articleId}`);

        if (error) {
            return { success: false, error: error.message };
        }

        if (!files || files.length === 0) {
            return { success: true, images: [] };
        }

        // Générer les URLs publiques
        const images = files.map(file => {
            const { data } = supabase.storage
                .from('articles-images')
                .getPublicUrl(`${userId}/${articleId}/${file.name}`);
            return data.publicUrl;
        });

        return { success: true, images };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Erreur lors de la récupération des images'
        };
    }
}

/**
 * Helper pour parser FormData dans Next.js API
 */
export async function parseFormData(req: any): Promise<{
    fields: Record<string, any>;
    files: Record<string, File | File[]>;
}> {
    // Next.js Pages Router n'a pas de support natif de FormData
    // On utilise donc formidable ou multiparty
    // Pour simplifier, on va utiliser les données directement du body

    // Note: Dans votre frontend, utilisez FormData et envoyez-le via fetch
    const formData = req.body;

    return {
        fields: formData.fields || {},
        files: formData.files || {}
    };
}