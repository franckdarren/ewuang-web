// ========================================
// Upload multiple images (galerie article)
// ========================================

import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { uploadArticleImage } from "../../../lib/upload";

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Upload multiple images pour un article
 *     description: >
 *       Permet à une boutique d'uploader jusqu'à 10 images
 *       dans la galerie d'un article.
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
 *               - article_id
 *               - files
 *             properties:
 *               article_id:
 *                 type: string
 *                 format: uuid
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploadées avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Article introuvable
 *       500:
 *         description: Erreur serveur
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
    api: { bodyParser: false },
};

// Parse FormData avec formidable
function parseForm(req: NextApiRequest) {
    return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
        (resolve, reject) => {
            const form = formidable({
                multiples: true,
                maxFiles: 10,
                maxFileSize: 5 * 1024 * 1024, // 5MB max
            });

            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        }
    );
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Méthode non autorisée" });
    }

    try {
        // 🔐 Authentification
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ success: false, error: "Token manquant" });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ success: false, error: "Token invalide" });

        // 📦 Parse FormData
        const { fields, files } = await parseForm(req);

        const articleId = Array.isArray(fields.article_id)
            ? fields.article_id[0]
            : fields.article_id;

        if (!articleId || !files.files) {
            return res.status(400).json({ success: false, error: "Paramètres manquants" });
        }

        // Récupérer les fichiers
        const fileArray = Array.isArray(files.files) ? files.files : [files.files];

        if (fileArray.length > 10) {
            return res.status(400).json({ success: false, error: "Maximum 10 images autorisées" });
        }

        const uploadedUrls: string[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i] as FormidableFile;

            // Lire le fichier
            const buffer = fs.readFileSync(file.filepath);

            // Créer un objet File pour la fonction upload
            const imageFile = new File(
                [buffer],
                file.originalFilename || `gallery-${i}.jpg`,
                { type: file.mimetype || "image/jpeg" }
            );

            // Upload vers Supabase
            const result = await uploadArticleImage(
                imageFile,
                user.id, // userId Supabase
                articleId,
                "gallery",
                i + 1
            );

            if (result.success && result.url) {
                uploadedUrls.push(result.url);
            }

            // Supprimer le fichier temporaire
            fs.unlinkSync(file.filepath);
        }

        return res.status(200).json({
            success: uploadedUrls.length > 0,
            message: `${uploadedUrls.length}/${fileArray.length} images uploadées`,
            uploaded_urls: uploadedUrls,
        });

    } catch (error: any) {
        console.error("Erreur upload multiple:", error);
        return res.status(500).json({ success: false, error: "Erreur serveur", message: error.message });
    }
}
