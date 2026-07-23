// pages/api/upload/avatar.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { uploadAvatarImage, UploadResult } from '../../../lib/upload';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Désactiver le body parser de Next.js (multipart géré par formidable)
export const config = {
    api: {
        bodyParser: false,
    },
};

/**
 * @swagger
 * /api/upload/avatar:
 *   post:
 *     summary: Upload la photo de profil de l'utilisateur connecté
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image (max 5MB, jpeg/png/webp)
 *     responses:
 *       200:
 *         description: Photo uploadée avec succès
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

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
            return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
        }

        // Parser le fichier
        const { files } = await parseForm(req);
        if (!files.file) {
            return res.status(400).json({ success: false, error: 'Fichier image requis' });
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const formidableFile = file as FormidableFile;
        const fileBuffer = fs.readFileSync(formidableFile.filepath);

        const imageFile = new File([fileBuffer], formidableFile.originalFilename || 'avatar.jpg', {
            type: formidableFile.mimetype || 'image/jpeg',
        });

        // L'avatar est rangé sous l'auth id de l'utilisateur (une photo par compte)
        const uploadResult: UploadResult = await uploadAvatarImage(imageFile, user.id);

        // Nettoyer le fichier temporaire
        fs.unlinkSync(formidableFile.filepath);

        if (!uploadResult.success) {
            return res.status(400).json({ success: false, error: uploadResult.error });
        }

        return res.status(200).json({
            success: true,
            message: 'Photo de profil uploadée avec succès',
            data: {
                // Cache-busting : le chemin est fixe (upsert), l'URL ne change pas
                url: `${uploadResult.url}?t=${Date.now()}`,
                path: uploadResult.path,
            },
        });
    } catch (error: any) {
        console.error('Erreur upload avatar:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur', message: error.message });
    }
}
