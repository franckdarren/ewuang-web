import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/zones-livraison/update/{id}:
 *   patch:
 *     summary: Met à jour une zone de livraison (admin)
 *     tags:
 *       - Zones de livraison
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ville:      { type: string }
 *               tarif:      { type: integer, minimum: 0 }
 *               is_active:  { type: boolean }
 *               is_default: { type: boolean }
 *     responses:
 *       200: { description: Zone mise à jour }
 *       400: { description: Données invalides }
 *       403: { description: Réservé aux administrateurs }
 *       404: { description: Zone introuvable }
 */

const updateSchema = z.object({
    ville: z.string().trim().min(1).max(100).optional(),
    tarif: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    is_default: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH" && req.method !== "PUT") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        if (profile.role !== "Administrateur") {
            return res.status(403).json({ error: "Accès interdit. Droits administrateur requis." });
        }

        const { id } = req.query;
        if (typeof id !== "string") {
            return res.status(400).json({ error: "Identifiant invalide" });
        }

        const body = updateSchema.parse(req.body);

        const { data: existing } = await supabaseAdmin
            .from("zones_livraison")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ error: "Zone introuvable" });
        }

        // Si le nom change, vérifier l'unicité
        if (body.ville && body.ville.toLowerCase() !== existing.ville.toLowerCase()) {
            const { data: duplicate } = await supabaseAdmin
                .from("zones_livraison")
                .select("id")
                .ilike("ville", body.ville)
                .neq("id", id)
                .maybeSingle();

            if (duplicate) {
                return res.status(400).json({ error: "Une autre zone porte déjà ce nom" });
            }
        }

        // Si on bascule cette zone en défaut, désactiver les autres
        if (body.is_default === true && !existing.is_default) {
            await supabaseAdmin
                .from("zones_livraison")
                .update({ is_default: false, updated_at: new Date().toISOString() })
                .eq("is_default", true);
        }

        // Empêcher de retirer le flag par défaut s'il n'y a aucune autre zone par défaut
        // (on impose qu'une zone par défaut existe toujours, sinon les villes inconnues
        // n'auraient pas de tarif de repli)
        if (body.is_default === false && existing.is_default) {
            return res.status(400).json({
                error: "Impossible de retirer le statut par défaut sans définir une autre zone par défaut",
            });
        }

        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };
        if (body.ville !== undefined) updatePayload.ville = body.ville.trim();
        if (body.tarif !== undefined) updatePayload.tarif = body.tarif;
        if (body.is_active !== undefined) updatePayload.is_active = body.is_active;
        if (body.is_default !== undefined) updatePayload.is_default = body.is_default;

        const { data: zone, error: updateErr } = await supabaseAdmin
            .from("zones_livraison")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        if (updateErr) {
            console.error("Erreur mise à jour zone:", updateErr);
            return res.status(500).json({ error: "Impossible de mettre à jour la zone" });
        }

        return res.status(200).json({ zone });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error /api/zones-livraison/update:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
