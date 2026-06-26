// pages/api/reviews/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { uploadReviewImage } from "../../../lib/upload";
import { notifyBoutiqueMembres } from "../../../app/lib/notifyBoutique";

/**
 * @swagger
 * /api/reviews/create:
 *   post:
 *     summary: Crée un avis sur un article
 *     description: >
 *       Permet à un utilisateur de laisser une note, un commentaire et
 *       jusqu'à 5 images sur un article.
 *       Un utilisateur ne peut laisser qu'un seul avis par article.
 *     tags:
 *       - Avis
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
 *               - note
 *             properties:
 *               article_id:
 *                 type: string
 *                 format: uuid
 *               note:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Note de 1 à 5 étoiles
 *               commentaire:
 *                 type: string
 *                 description: Commentaire optionnel
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Jusqu'à 5 images (jpeg, png, webp - max 5 Mo chacune)
 *     responses:
 *       201:
 *         description: Avis créé avec succès
 *       400:
 *         description: Données invalides ou avis déjà existant
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Article introuvable
 *       500:
 *         description: Erreur serveur
 */

export const config = {
    api: { bodyParser: false },
};

const MAX_REVIEW_IMAGES = 5;

const createReviewSchema = z.object({
    article_id: z.string().uuid(),
    note: z.coerce.number().int().min(1).max(5),
    commentaire: z.string().optional(),
});

function parseForm(req: NextApiRequest) {
    return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
        (resolve, reject) => {
            const form = formidable({
                multiples: true,
                maxFiles: MAX_REVIEW_IMAGES,
                maxFileSize: 5 * 1024 * 1024, // 5 Mo max
            });

            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        }
    );
}

function firstValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const token = req.headers.authorization?.replace("Bearer ", "");

        const { fields, files } = await parseForm(req);

        const body = createReviewSchema.parse({
            article_id: firstValue(fields.article_id),
            note: firstValue(fields.note),
            commentaire: firstValue(fields.commentaire),
        });

        // Vérifier que l'article existe (user_id = boutique propriétaire)
        const { data: article, error: articleError } = await supabaseAdmin
            .from("articles")
            .select("id, nom, user_id")
            .eq("id", body.article_id)
            .single();

        if (articleError || !article) {
            return res.status(404).json({ error: "Article introuvable" });
        }

        // Vérifier si l'utilisateur a déjà laissé un avis
        const { data: existing } = await supabaseAdmin
            .from("avis")
            .select("id")
            .eq("user_id", profile.id)
            .eq("article_id", body.article_id)
            .single();

        if (existing) {
            return res.status(400).json({
                error: "Vous avez déjà laissé un avis sur cet article"
            });
        }

        // Créer l'avis (sans images dans un premier temps)
        const { data: review, error: insertError } = await supabaseAdmin
            .from("avis")
            .insert({
                user_id: profile.id,
                article_id: body.article_id,
                note: body.note,
                commentaire: body.commentaire || null,
                images: [],
                is_moderated: false,
                is_visible: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertError || !review) {
            console.error("Supabase insert error:", insertError);
            return res.status(500).json({ error: "Impossible de créer l'avis" });
        }

        // Uploader les images éventuelles
        const rawImages = files.images;
        const imageFiles = (
            rawImages ? (Array.isArray(rawImages) ? rawImages : [rawImages]) : []
        ) as FormidableFile[];

        const uploadedUrls: string[] = [];

        for (let i = 0; i < imageFiles.length && i < MAX_REVIEW_IMAGES; i++) {
            const file = imageFiles[i];
            try {
                const buffer = fs.readFileSync(file.filepath);
                const imageFile = new File(
                    [buffer],
                    file.originalFilename || `img-${i}.jpg`,
                    { type: file.mimetype || "image/jpeg" }
                );

                const result = await uploadReviewImage(
                    imageFile,
                    profile.id,
                    review.id,
                    i + 1,
                    token
                );

                if (result.success && result.url) {
                    uploadedUrls.push(result.url);
                }
            } finally {
                try {
                    fs.unlinkSync(file.filepath);
                } catch {
                    // fichier temporaire déjà supprimé
                }
            }
        }

        // Mettre à jour l'avis avec les URLs des images
        const { data: finalReview, error: updateError } = await supabaseAdmin
            .from("avis")
            .update({ images: uploadedUrls, updated_at: new Date().toISOString() })
            .eq("id", review.id)
            .select(`
        *,
        users!inner (id, name),
        articles!inner (id, nom)
      `)
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Avis créé mais impossible d'enregistrer les images" });
        }

        // Notifier la boutique propriétaire de l'article (in-app + push,
        // fan-out aux gérants). Best-effort : ne bloque jamais la création.
        if (article.user_id) {
            await notifyBoutiqueMembres(article.user_id as string, {
                type: "Avis",
                titre: "Nouvel avis sur un de vos articles",
                message: `${profile.name ?? "Un client"} a laissé un avis ${body.note}★ sur « ${article.nom} ».`,
                lien: "/boutique/articles",
            });
        }

        return res.status(201).json({
            message: "Avis créé avec succès",
            review: finalReview,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/reviews/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
