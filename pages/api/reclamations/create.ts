import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/create:
 *   post:
 *     summary: Crée une réclamation
 *     description: Crée une nouvelle réclamation pour une commande donnée.
 *     tags:
 *       - Réclamations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - phone
 *               - commande_id
 *             properties:
 *               description:
 *                 type: string
 *               phone:
 *                 type: string
 *               commande_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Réclamation créée
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */

const schema = z.object({
    description: z.string().min(1),
    phone: z.string().min(1),
    commande_id: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = schema.parse(req.body);

        const { data, error } = await supabaseAdmin
            .from("reclamations")
            .insert({
                description: body.description,
                phone: body.phone,
                commande_id: body.commande_id,
                user_id: profile.id,
                statut: "En attente de traitement",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Impossible de créer la réclamation" });
        }

        return res.status(201).json({
            message: "Réclamation créée avec succès",
            reclamation: data
        });
    } catch (err) {
        console.log(err);
        if (err instanceof ZodError) {
            return res.status(400).json({ error: "Body invalide", issues: err.issues });
        }
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
