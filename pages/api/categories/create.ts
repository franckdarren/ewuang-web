import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/categories/create:
 *   post:
 *     summary: Crée une nouvelle catégorie
 *     description: Crée une catégorie (Admin uniquement)
 *     tags:
 *       - Catégories
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
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               parent_id:
 *                 type: string
 *               ordre:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Catégorie créée
 *       403:
 *         description: Non autorisé (non admin)
 */

const createSchema = z.object({
    nom: z.string().min(1, "Le nom est requis"),
    description: z.string().optional(),
    image: z.string().url().optional(),
    parent_id: z.string().uuid().optional(),
    ordre: z.number().int().min(0).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        // Vérifier que l'utilisateur est admin
        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès interdit. Droits administrateur requis." });
        }

        const body = createSchema.parse(req.body);

        // Générer le slug
        const slug = body.nom
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Vérifier l'unicité du slug
        const { data: existing } = await supabaseAdmin
            .from("categories")
            .select("id")
            .eq("slug", slug)
            .single();

        if (existing) {
            return res.status(400).json({ error: "Une catégorie avec ce nom existe déjà" });
        }

        // Vérifier le parent si fourni
        if (body.parent_id) {
            const { data: parent } = await supabaseAdmin
                .from("categories")
                .select("id")
                .eq("id", body.parent_id)
                .single();

            if (!parent) {
                return res.status(400).json({ error: "Catégorie parente introuvable" });
            }
        }

        // Créer la catégorie
        const { data: category, error: insertErr } = await supabaseAdmin
            .from("categories")
            .insert({
                nom: body.nom.trim(),
                slug,
                description: body.description ?? null,
                image: body.image ?? null,
                parent_id: body.parent_id ?? null,
                ordre: body.ordre ?? 0,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertErr) {
            console.error("Erreur création catégorie:", insertErr);
            return res.status(500).json({ error: "Impossible de créer la catégorie" });
        }

        return res.status(201).json({ category });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/categories/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}