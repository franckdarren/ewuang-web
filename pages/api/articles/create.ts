// pages/api/articles/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/articles/create:
 *   post:
 *     summary: Crée un nouvel article
 *     description: >
 *       Crée un article lié à l'utilisateur connecté.  
 *       Le body peut contenir un tableau "variations" (couleur, taille, prix, stock)  
 *       et un tableau "images" pour les images supplémentaires.
 *     tags:
 *       - Articles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prix
 *               - categorie
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               prix:
 *                 type: integer
 *               prixPromotion:
 *                 type: integer
 *               isPromotion:
 *                 type: boolean
 *               pourcentageReduction:
 *                 type: integer
 *               madeInGabon:
 *                 type: boolean
 *               categorie:
 *                 type: string
 *               image_principale:
 *                 type: string
 *               variations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     couleur:
 *                       type: string
 *                     taille:
 *                       type: string
 *                     prix:
 *                       type: integer
 *                     stock:
 *                       type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url_photo:
 *                       type: string
 *     responses:
 *       201:
 *         description: Article créé
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const createSchema = z.object({
    nom: z.string().min(1),
    description: z.string().optional(),
    prix: z.number().int().nonnegative(),
    prixPromotion: z.number().int().nonnegative().optional(),
    isPromotion: z.boolean().optional(),
    pourcentageReduction: z.number().int().min(0).max(100).optional(),
    madeInGabon: z.boolean().optional(),
    categorie: z.string().min(1),
    image_principale: z.string().url().optional(),
    variations: z.array(
        z.object({
            couleur: z.string().optional(),
            taille: z.string().optional(),
            prix: z.number().int().nonnegative().optional(),
            stock: z.number().int().nonnegative().optional(),
        })
    ).optional(),
    images: z.array(
        z.object({
            url_photo: z.string().url(),
        })
    ).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = createSchema.parse(req.body);

        // 1) Insert article
        const { data: article, error: insertErr } = await supabaseAdmin
            .from("articles")
            .insert({
                nom: body.nom,
                description: body.description ?? null,
                prix: body.prix,
                prixPromotion: body.prixPromotion ?? null,
                isPromotion: body.isPromotion ?? false,
                pourcentageReduction: body.pourcentageReduction ?? 0,
                madeInGabon: body.madeInGabon ?? false,
                user_id: profile.id,
                categorie: body.categorie,
                image_principale: body.image_principale ?? null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertErr) {
            console.error("Supabase insert article error:", insertErr);
            return res.status(500).json({ error: "Impossible de créer l'article" });
        }

        // 2) Insert variations
        if (body.variations?.length) {
            const variationsToInsert = body.variations.map(v => ({
                article_id: article.id,
                couleur: v.couleur ?? null,
                taille: v.taille ?? null,
                prix: v.prix ?? null,
                stock: v.stock ?? 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }));

            const { error: varErr } = await supabaseAdmin
                .from("variations")
                .insert(variationsToInsert);

            if (varErr) console.warn("Impossible d'ajouter des variations :", varErr);
        }

        // 3) Insert images
        if (body.images?.length) {
            const imagesToInsert = body.images.map(img => ({
                article_id: article.id,
                url_photo: img.url_photo,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }));

            const { error: imgErr } = await supabaseAdmin
                .from("image_articles")
                .insert(imagesToInsert);

            if (imgErr) console.warn("Impossible d'ajouter des images :", imgErr);
        }

        return res.status(201).json({ article });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/articles/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
