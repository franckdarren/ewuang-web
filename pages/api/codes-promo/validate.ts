import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

const validateSchema = z.object({
    code: z.string().min(1),
    article_ids: z.array(z.string().uuid()).min(1),
    sous_total: z.number().positive(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;

        const body = validateSchema.parse(req.body);

        const { data: promo, error } = await supabaseAdmin
            .from("codes_promo")
            .select("*")
            .eq("code", body.code.toUpperCase())
            .eq("est_actif", true)
            .single();

        if (error || !promo) {
            return res.status(404).json({ error: "Code promo invalide ou inexistant" });
        }

        if (promo.date_expiration && new Date(promo.date_expiration) < new Date()) {
            return res.status(400).json({ error: "Ce code promo a expiré" });
        }

        if (promo.utilisations_max !== null && promo.utilisations_actuelles >= promo.utilisations_max) {
            return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation" });
        }

        // Vérifier que le code s'applique à au moins un article du panier
        if (promo.article_id) {
            const applicable = body.article_ids.includes(promo.article_id);
            if (!applicable) {
                return res.status(400).json({ error: "Ce code promo ne s'applique pas aux articles de votre panier" });
            }
        }

        if (body.sous_total < promo.montant_min) {
            return res.status(400).json({
                error: `Montant minimum requis : ${promo.montant_min} FCFA`
            });
        }

        const remise = promo.type === "pourcentage"
            ? Math.round(body.sous_total * promo.valeur / 100)
            : Math.min(promo.valeur, body.sous_total);

        return res.status(200).json({
            valid: true,
            code_promo_id: promo.id,
            type: promo.type,
            valeur: promo.valeur,
            remise,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
            });
        }
        console.error("Error /api/codes-promo/validate:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}
