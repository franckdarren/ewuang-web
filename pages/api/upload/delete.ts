// ========================================
// pages/api/upload/delete.ts
// Suppression d'images (Supabase only)
// ========================================

import type { NextApiRequest, NextApiResponse } from "next";
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
 *                 enum: [articles-images, variations-images]
 *               path:
 *                 type: string
 *                 description: Chemin complet du fichier dans le bucket
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "DELETE") {
        return res.status(405).json({
            success: false,
            error: "Méthode non autorisée",
        });
    }

    try {
        // 🔐 Authentification
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: "Token manquant",
            });
        }

        const token = authHeader.replace("Bearer ", "");
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: "Token invalide",
            });
        }

        const { bucket, path, article_id } = req.body;

        // 🔹 CAS 1 : supprimer une image précise
        if (bucket && path) {
            // Sécurité : le chemin doit commencer par l'id utilisateur
            if (!path.startsWith(user.id)) {
                return res.status(403).json({
                    success: false,
                    error: "Accès interdit",
                });
            }

            const result = await deleteImage(bucket, path);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }

            return res.status(200).json({
                success: true,
                message: "Image supprimée avec succès",
            });
        }

        // 🔹 CAS 2 : supprimer toutes les images d’un article
        if (article_id) {
            const result = await deleteArticleImages(user.id, article_id);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }

            return res.status(200).json({
                success: true,
                message: "Toutes les images de l'article ont été supprimées",
            });
        }

        // ❌ Paramètres invalides
        return res.status(400).json({
            success: false,
            error: "bucket + path OU article_id requis",
        });
    } catch (error: any) {
        console.error("Erreur suppression image:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur serveur lors de la suppression",
            message: error.message,
        });
    }
}
