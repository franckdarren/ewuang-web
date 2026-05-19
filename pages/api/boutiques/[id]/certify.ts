import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/boutiques/{id}/certify:
 *   patch:
 *     summary: Certifie ou retire la certification d'une boutique
 *     description: >
 *       Accorde ou retire le label "Boutique certifiée" à un utilisateur dont le rôle est "Boutique".
 *       Réservé aux administrateurs. La traçabilité (date + admin) est enregistrée.
 *     tags: [Boutiques]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur boutique
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_certified:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Boutique mise à jour
 *       400:
 *         description: Requête invalide
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès interdit (réservé aux administrateurs)
 *       404:
 *         description: Boutique introuvable
 *       500:
 *         description: Erreur serveur
 */

const paramsSchema = z.object({ id: z.string().uuid("ID invalide") });
const bodySchema = z.object({ is_certified: z.boolean() });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { profile } = auth;
    if (profile.role !== "Administrateur") {
        return res.status(403).json({ error: "Accès interdit : réservé aux administrateurs" });
    }

    try {
        const { id } = paramsSchema.parse(req.query);
        const { is_certified } = bodySchema.parse(req.body);

        // Vérifie que la cible est bien une boutique
        const { data: target, error: findError } = await supabaseAdmin
            .from("users")
            .select("id, role")
            .eq("id", id)
            .maybeSingle();

        if (findError) return res.status(500).json({ error: findError.message });
        if (!target) return res.status(404).json({ error: "Utilisateur introuvable" });
        if (target.role !== "Boutique") {
            return res.status(400).json({ error: "Seules les boutiques peuvent être certifiées" });
        }

        const { data: updated, error } = await supabaseAdmin
            .from("users")
            .update({
                is_certified,
                certified_at: is_certified ? new Date().toISOString() : null,
                certified_by: is_certified ? profile.id : null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select("*")
            .maybeSingle();

        if (error) return res.status(500).json({ error: error.message });

        return res.status(200).json({
            message: is_certified
                ? "Boutique certifiée avec succès"
                : "Certification retirée",
            user: updated,
        });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/boutiques/[id]/certify:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
