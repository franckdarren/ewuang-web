import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/publicites/update/{id}:
 *   patch:
 *     summary: Met à jour une publicité
 *     tags: [Publicites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la publicité
 *       - in: header
 *         name: Authorization
 *         required: true
 *     requestBody:
 *       required: true
 *       description: Champs à modifier
 *     responses:
 *       200:
 *         description: Mise à jour réussie
 *       404:
 *         description: Publicité introuvable
 */

const updateSchema = z.object({
    titre: z.string().optional(),
    url_image: z.string().url().optional(),
    lien: z.string().url().optional(),
    description: z.string().optional(),
    date_start: z.string().optional(),
    date_end: z.string().optional(),
    is_actif: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        // Auth obligatoire
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        // Lire l'id depuis l'URL
        const id = req.query.id;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID invalide ou manquant" });
        }

        // Valider body
        const body = updateSchema.parse(req.body);

        // Construire l'objet de mise à jour
        const toUpdate: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined) {
                toUpdate[key] = value;
            }
        });

        // Mise à jour Supabase
        const { data, error } = await supabaseAdmin
            .from("publicites")
            .update(toUpdate)
            .eq("id", id)
            .select()
            .single();

        if (error || !data)
            return res.status(404).json({ error: "Publicité introuvable" });

        return res.status(200).json({
            message: "Mise à jour réussie",
            publicite: data,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({ errors: err.flatten() });
        }
        console.error("Erreur update:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
