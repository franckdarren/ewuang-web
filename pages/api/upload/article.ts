// pages/api/upload/article.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { uploadArticleImage, UploadResult } from '../../../lib/upload';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Désactiver le body parser de Next.js
export const config = {
    api: {
        bodyParser: false,
    },
};

/**
 * @swagger
 * /api/upload/article:
 *   post:
 *     summary: Upload une image pour un article
 *     tags: Upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - article_id
 *               - type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image (max 5MB)
 *               article_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'article
 *               type:
 *                 type: string
 *                 enum: [principale, gallery]
 *                 default: principale
 *               index:
 *                 type: integer
 *                 description: Index pour les images de galerie (optionnel)
 *     responses:
 *       200:
 *         description: Image uploadée avec succès
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

// Parse FormData avec formidable
async function parseForm(req: NextApiRequest): Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
}> {
    return new Promise((resolve, reject) => {
        const form = formidable({ multiples: false, maxFileSize: 5 * 1024 * 1024 });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
    }

    try {
        // Authentification via token Bearer
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, error: "Token d'authentification manquant" });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ success: false, error: "Token invalide ou expiré" });
        }

        // Parser FormData
        const { fields, files } = await parseForm(req);

        // Récupérer et normaliser les champs
        const articleId = Array.isArray(fields.article_id) ? fields.article_id[0] : fields.article_id;
        const type = (Array.isArray(fields.type) ? fields.type[0] : fields.type) || 'principale';
        const index = fields.index ? parseInt(Array.isArray(fields.index) ? fields.index[0] : fields.index) : undefined;

        if (!articleId) return res.status(400).json({ success: false, error: "article_id requis" });
        if (!files.file) return res.status(400).json({ success: false, error: "Fichier image requis" });

        // Récupérer le fichier
        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const formidableFile = file as FormidableFile;

        const fileBuffer = fs.readFileSync(formidableFile.filepath);

        // Créer un objet File compatible
        const imageFile = new File([fileBuffer], formidableFile.originalFilename || 'image.jpg', {
            type: formidableFile.mimetype || 'image/jpeg',
        });

        // Upload image vers Supabase
        const uploadResult: UploadResult = await uploadArticleImage(
            imageFile,
            user.id,
            articleId,
            type as 'principale' | 'gallery',
            index
        );

        if (!uploadResult.success) {
            return res.status(400).json({ success: false, error: uploadResult.error });
        }

        // Nettoyer le fichier temporaire
        fs.unlinkSync(formidableFile.filepath);

        return res.status(200).json({
            success: true,
            message: 'Image uploadée avec succès',
            data: {
                url: uploadResult.url,
                path: uploadResult.path,
                type
            }
        });
    } catch (error: any) {
        console.error('Erreur upload article:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur', message: error.message });
    }
}
