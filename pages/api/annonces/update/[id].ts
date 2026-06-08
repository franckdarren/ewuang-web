import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/annonces/update/{id}:
 *   patch:
 *     summary: Met à jour une publicité
 *     description: Un non-administrateur ne peut modifier que ses propres publicités.
 *     tags: [Publicites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la publicité
 *     requestBody:
 *       required: true
 *       description: Champs à modifier
 *     responses:
 *       200:
 *         description: Mise à jour réussie
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Publicité introuvable
 */

const updateSchema = z.object({
    titre: z.string().optional(),
    url_image: z.string().url().optional(),
    lien: z.string().url().optional().or(z.literal("")),
    description: z.string().optional(),
    date_start: z.string().optional(),
    date_end: z.string().optional(),
    is_actif: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const id = req.query.id;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID invalide ou manquant" });
        }

        // Vérifier l'appartenance avant la mise à jour
        const isAdmin = auth.profile.role === "Administrateur";
        if (!isAdmin) {
            const { data: existing } = await supabaseAdmin
                .from("publicites")
                .select("user_id")
                .eq("id", id)
                .single();

            if (!existing) return res.status(404).json({ error: "Publicité introuvable" });
            if (existing.user_id !== auth.authUser.id) {
                return res.status(403).json({ error: "Accès interdit" });
            }
        }

        const body = updateSchema.parse(req.body);

        const toUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined) toUpdate[key] = value;
        });

        const { data, error } = await supabaseAdmin
            .from("publicites")
            .update(toUpdate)
            .eq("id", id)
            .select()
            .single();

        if (error || !data)
            return res.status(404).json({ error: "Publicité introuvable" });

        return res.status(200).json({ message: "Mise à jour réussie", publicite: data });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({ errors: err.flatten() });
        }
        console.error("Erreur update:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
