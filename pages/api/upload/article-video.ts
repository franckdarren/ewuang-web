// pages/api/upload/article-video.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { uploadArticleVideo, UploadResult } from '../../../lib/upload';

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
 * /api/upload/article-video:
 *   post:
 *     summary: Upload la vidéo promotionnelle d'un article
 *     description: >
 *       Une seule vidéo par article (contrairement aux images, pas de galerie).
 *       Un nouvel upload remplace la vidéo existante.
 *     tags:
 *       - Upload
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier vidéo (MP4 ou MOV, max 50MB)
 *               article_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'article
 *     responses:
 *       200:
 *         description: Vidéo uploadée avec succès
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
        const form = formidable({ multiples: false, maxFileSize: 50 * 1024 * 1024 });
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

        if (!articleId) return res.status(400).json({ success: false, error: "article_id requis" });
        if (!files.file) return res.status(400).json({ success: false, error: "Fichier vidéo requis" });

        // Récupérer le fichier
        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const formidableFile = file as FormidableFile;

        const fileBuffer = fs.readFileSync(formidableFile.filepath);

        // Créer un objet File compatible
        const videoFile = new File([fileBuffer], formidableFile.originalFilename || 'video.mp4', {
            type: formidableFile.mimetype || 'video/mp4',
        });

        // Upload vidéo vers Supabase (avec le token utilisateur pour le RLS)
        const uploadResult: UploadResult = await uploadArticleVideo(
            videoFile,
            user.id,
            articleId,
            token
        );

        if (!uploadResult.success) {
            return res.status(400).json({ success: false, error: uploadResult.error });
        }

        // Nettoyer le fichier temporaire
        fs.unlinkSync(formidableFile.filepath);

        return res.status(200).json({
            success: true,
            message: 'Vidéo uploadée avec succès',
            data: {
                url: `${uploadResult.url}?t=${Date.now()}`,
                path: uploadResult.path,
            }
        });
    } catch (error: any) {
        console.error('Erreur upload article video:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur', message: error.message });
    }
}
