import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../app/lib/permissions";

/**
 * @swagger
 * /api/zones-livraison/create:
 *   post:
 *     summary: Crée une zone de livraison (admin)
 *     tags:
 *       - Zones de livraison
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ville, tarif]
 *             properties:
 *               ville:    { type: string }
 *               tarif:    { type: integer, minimum: 0 }
 *               is_active:  { type: boolean }
 *               is_default: { type: boolean }
 *     responses:
 *       201: { description: Zone créée }
 *       400: { description: Données invalides ou ville déjà existante }
 *       403: { description: Réservé aux administrateurs }
 */

const createSchema = z.object({
    ville: z.string().trim().min(1, "Le nom de la ville est requis").max(100),
    tarif: z.number().int().min(0, "Le tarif doit être positif"),
    is_active: z.boolean().optional().default(true),
    is_default: z.boolean().optional().default(false),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requirePermission(req, res, "zones_livraison.write");
        if (!auth) return;

        const body = createSchema.parse(req.body);
        const villeNormalized = body.ville.trim();

        // Vérifier l'unicité (insensible à la casse)
        const { data: existing } = await supabaseAdmin
            .from("zones_livraison")
            .select("id")
            .ilike("ville", villeNormalized)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: "Une zone existe déjà pour cette ville" });
        }

        // Si is_default=true, désactiver l'ancienne zone par défaut
        if (body.is_default) {
            await supabaseAdmin
                .from("zones_livraison")
                .update({ is_default: false, updated_at: new Date().toISOString() })
                .eq("is_default", true);
        }

        const { data: zone, error: insertErr } = await supabaseAdmin
            .from("zones_livraison")
            .insert({
                ville: villeNormalized,
                tarif: body.tarif,
                is_active: body.is_active,
                is_default: body.is_default,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertErr) {
            console.error("Erreur création zone:", insertErr);
            return res.status(500).json({ error: "Impossible de créer la zone" });
        }

        return res.status(201).json({ zone });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error /api/zones-livraison/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
