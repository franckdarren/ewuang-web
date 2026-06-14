import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../app/lib/middlewares/requireBoutiqueAccess";

const createSchema = z.object({
    code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/, "Le code ne doit contenir que des lettres majuscules, chiffres, - ou _"),
    article_id: z.string().uuid().optional(),
    type: z.enum(["pourcentage", "montant_fixe"]),
    valeur: z.number().positive(),
    montant_min: z.number().min(0).default(0),
    utilisations_max: z.number().int().positive().nullable().default(null),
    date_expiration: z.string().datetime().nullable().default(null),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        const body = createSchema.parse(req.body);

        if (body.type === "pourcentage" && body.valeur > 100) {
            return res.status(400).json({ error: "Le pourcentage ne peut pas dépasser 100" });
        }

        // Si article_id fourni, vérifier que l'article appartient à la boutique
        if (body.article_id) {
            const { data: article } = await supabaseAdmin
                .from("articles")
                .select("user_id")
                .eq("id", body.article_id)
                .single();

            if (!article || article.user_id !== access.boutiqueId) {
                return res.status(403).json({ error: "Cet article n'appartient pas à votre boutique" });
            }
        }

        const { data: promo, error } = await supabaseAdmin
            .from("codes_promo")
            .insert({
                code: body.code.toUpperCase(),
                article_id: body.article_id || null,
                boutique_id: access.boutiqueId,
                type: body.type,
                valeur: body.valeur,
                montant_min: body.montant_min,
                utilisations_max: body.utilisations_max,
                date_expiration: body.date_expiration,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({ error: "Ce code promo existe déjà" });
            }
            throw error;
        }

        return res.status(201).json({ promo });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error /api/codes-promo/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
