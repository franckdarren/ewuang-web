// ========================================
// Suppression d'images
// ========================================

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { deleteImage, deleteArticleImages } from "../../../lib/upload";

/**
 * @swagger
 * /api/upload/delete:
 *   delete:
 *     summary: Supprimer une image ou toutes les images d’un article
 *     tags:
 *       - Upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bucket:
 *                 type: string
 *               path:
 *                 type: string
 *               article_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Suppression réussie
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Ressource introuvable
 *       500:
 *         description: Erreur serveur
 */

const prisma = new PrismaClient();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
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

        const { bucket, path, article_id } = req.body;

        // 🔹 Supprimer une image précise
        if (bucket && path) {
            if (!path.startsWith(userData.id)) {
                return res.status(403).json({ error: "Non autorisé" });
            }

            await deleteImage(bucket, path);

            await prisma.image_articles.deleteMany({
                where: { url_photo: { contains: path } },
            });

            return res.status(200).json({ success: true });
        }

        // 🔹 Supprimer toutes les images d’un article
        if (article_id) {
            const article = await prisma.articles.findFirst({
                where: { id: article_id, user_id: userData.id },
            });

            if (!article) {
                return res.status(404).json({ error: "Article introuvable" });
            }

            await deleteArticleImages(userData.id, article_id);

            await prisma.image_articles.deleteMany({
                where: { article_id },
            });

            return res.status(200).json({ success: true });
        }

        return res.status(400).json({
            error: "bucket + path OU article_id requis",
        });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: "Erreur suppression" });
    } finally {
        await prisma.$disconnect();
    }
}
