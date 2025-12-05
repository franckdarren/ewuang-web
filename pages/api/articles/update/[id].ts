// pages/api/articles/update/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/articles/update/{id}:
 *   patch:
 *     summary: Met à jour un article (propriétaire uniquement)
 *     description: Met à jour un article existant. Seul le propriétaire (user_id) peut modifier.
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 */
const updateSchema = z.object({
    nom: z.string().min(1).optional(),
    description: z.string().optional(),
    prix: z.number().int().nonnegative().optional(),
    prix_promotion: z.number().int().nonnegative().optional(),
    is_promotion: z.boolean().optional(),
    pourcentage_reduction: z.number().int().min(0).max(100).optional(),
    made_in_gabon: z.boolean().optional(),
    categorie: z.string().optional(),
    image_principale: z.string().url().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;
        if (!id || typeof id !== "string") return res.status(400).json({ error: "ID article manquant" });

        const body = updateSchema.parse(req.body);

        // Vérifier que l'article existe et appartient à l'utilisateur
        const { data: existing, error: findErr } = await supabaseAdmin
            .from("articles")
            .select("*")
            .eq("id", id)
            .single();

        if (findErr || !existing) return res.status(404).json({ error: "Article introuvable" });
        if (existing.user_id !== profile.id) return res.status(403).json({ error: "Accès refusé" });

        const payload = { ...body, updated_at: new Date().toISOString() };
        const { data: updated, error: updateErr } = await supabaseAdmin
            .from("articles")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (updateErr) {
            console.error("Erreur update article:", updateErr);
            return res.status(500).json({ error: "Impossible de mettre à jour l'article" });
        }

        return res.status(200).json({ article: updated });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.issues });
        console.error("Error /api/articles/update:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
