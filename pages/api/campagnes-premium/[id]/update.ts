import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../../app/lib/permissions";

const POSITIONS = ["banniere_accueil", "banniere_categorie", "banniere_boutique"] as const;

const schema = z.object({
    position: z.enum(POSITIONS).optional(),
    titre: z.string().min(1).max(255).optional(),
    url_image: z.string().url().optional(),
    lien: z.string().url().optional().or(z.literal("")).nullable(),
    description: z.string().optional().nullable(),
    date_start: z.string().refine((v) => !isNaN(Date.parse(v)), "Date invalide").optional(),
    date_end: z.string().refine((v) => !isNaN(Date.parse(v)), "Date invalide").optional(),
    categorie_id: z.string().uuid().optional().nullable(),
    boutique_id: z.string().uuid().optional().nullable(),
    prix: z.number().int().positive().optional().nullable(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "publicites_premium.write");
        if (!auth) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") return res.status(400).json({ error: "ID invalide" });

        const body = schema.parse(req.body);

        if (body.date_start && body.date_end && new Date(body.date_end) <= new Date(body.date_start)) {
            return res.status(400).json({ error: "La date de fin doit être après la date de début" });
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (body.position !== undefined) updateData.position = body.position;
        if (body.titre !== undefined) updateData.titre = body.titre;
        if (body.url_image !== undefined) updateData.url_image = body.url_image;
        if ("lien" in body) updateData.lien = body.lien ?? null;
        if ("description" in body) updateData.description = body.description ?? null;
        if (body.date_start) updateData.date_start = new Date(body.date_start).toISOString();
        if (body.date_end) updateData.date_end = new Date(body.date_end).toISOString();
        if ("categorie_id" in body) updateData.categorie_id = body.categorie_id ?? null;
        if ("boutique_id" in body) updateData.boutique_id = body.boutique_id ?? null;
        if ("prix" in body) updateData.prix = body.prix ?? null;

        const { data, error } = await supabaseAdmin
            .from("publicites_premium")
            .update(updateData)
            .eq("id", id)
            .select("*, boutique:boutique_id(id, name, email, url_logo), categorie:categorie_id(id, nom, slug)")
            .single();

        if (error) {
            console.error("[campagnes-premium/update] error:", error);
            return res.status(500).json({ error: "Impossible de mettre à jour la publicité premium" });
        }

        return res.status(200).json({ publicite_premium: data });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.flatten() });
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
