// ========================================
// Upload multiple images (galerie article)
// ========================================

import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import type { File as FormidableFile } from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
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

const prisma = new PrismaClient();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
    api: {
        bodyParser: false,
    },
};

function parseForm(req: NextApiRequest) {
    return new Promise<{
        fields: formidable.Fields;
        files: formidable.Files;
    }>((resolve, reject) => {
        const form = formidable({
            multiples: true,
            maxFiles: 10,
            maxFileSize: 5 * 1024 * 1024,
        });

        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // 🔐 Auth
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ error: "Token manquant" });

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: "Token invalide" });

        const userData = await prisma.users.findUnique({
            where: { auth_id: user.id },
        });

        if (!userData) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        // 📦 Parse form
        const { fields, files } = await parseForm(req);

        const articleId = Array.isArray(fields.article_id)
            ? fields.article_id[0]
            : fields.article_id;

        if (!articleId || !files.files) {
            return res.status(400).json({ error: "Paramètres manquants" });
        }

        // 🔎 Vérifier article
        const article = await prisma.articles.findFirst({
            where: { id: articleId, user_id: userData.id },
        });

        if (!article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        const fileArray = Array.isArray(files.files)
            ? files.files
            : [files.files];

        const uploadedUrls: string[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i] as FormidableFile;

            const buffer = fs.readFileSync(file.filepath);

            const image = new File(
                [buffer],
                file.originalFilename || `gallery-${i}.jpg`,
                { type: file.mimetype || "image/jpeg" }
            );

            const result = await uploadArticleImage(
                image,
                userData.id,
                articleId,
                "gallery",
                i + 1
            );

            if (result.success && result.url) {
                uploadedUrls.push(result.url);

                await prisma.image_articles.create({
                    data: {
                        article_id: articleId,
                        url_photo: result.url,
                    },
                });
            }

            fs.unlinkSync(file.filepath);
        }

        return res.status(200).json({
            success: true,
            uploaded_urls: uploadedUrls,
        });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: "Erreur upload" });
    } finally {
        await prisma.$disconnect();
    }
}
