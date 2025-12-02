// pages/api/publicites/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/publicites/create:
 *   post:
 *     summary: Crée une nouvelle publicité
 *     description: >
 *       Crée une publicité liée à l'utilisateur connecté.
 *     tags:
 *       - Publicites
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titre
 *               - date_start
 *               - date_end
 *               - url_image
 *               - lien
 *               - description
 *               - isActif
 *             properties:
 *               titre: { type: string }
 *               url_image: { type: string }
 *               lien: { type: string }
 *               description: { type: string }
 *               date_start: { type: string, format: date-time }
 *               date_end: { type: string, format: date-time }
 *               is_actif: { type: boolean }
 *     responses:
 *       201:
 *         description: Publicité créée
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */

const schema = z.object({
    titre: z.string().min(1),
    url_image: z.string().url(),
    lien: z.string().url(),
    description: z.string().min(1),
    date_start: z.string().refine(v => !isNaN(Date.parse(v)), "Invalid date"),
    date_end: z.string().refine(v => !isNaN(Date.parse(v)), "Invalid date"),
    is_actif: z.boolean(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const body = schema.parse(req.body);

        const { data, error } = await supabaseAdmin
            .from("publicites")
            .insert({
                titre: body.titre,
                description: body.description,
                url_image: body.url_image,
                lien: body.lien,
                date_start: new Date(body.date_start).toISOString(),
                date_end: new Date(body.date_end).toISOString(),
                is_actif: body.is_actif,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })

            .select()
            .single();

        if (error) return res.status(500).json({ error: "Impossible de créer la publicité" });

        return res.status(201).json({ publicité: data });
    } catch (err) {
        if (err instanceof ZodError)
            return res.status(400).json({ errors: err.flatten() });

        return res.status(500).json({ error: "Erreur serveur" });
    }
}
