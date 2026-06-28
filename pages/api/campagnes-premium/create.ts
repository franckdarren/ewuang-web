import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requirePermission } from "../../../app/lib/permissions";

const POSITIONS = ["banniere_accueil", "banniere_categorie", "banniere_boutique"] as const;

const schema = z.object({
    position: z.enum(POSITIONS),
    titre: z.string().min(1).max(255),
    url_image: z.string().url(),
    lien: z.string().url().optional().or(z.literal("")).nullable(),
    description: z.string().optional().nullable(),
    date_start: z.string().refine((v) => !isNaN(Date.parse(v)), "Date invalide"),
    date_end: z.string().refine((v) => !isNaN(Date.parse(v)), "Date invalide"),
    categorie_id: z.string().uuid().optional().nullable(),
    boutique_id: z.string().uuid().optional().nullable(),
    prix: z.number().int().positive().optional().nullable(),
});

async function findConflict(
    position: string,
    dateStart: string,
    dateEnd: string,
    categorieId: string | null | undefined,
    boutiqueId: string,
    excludeId?: string
): Promise<{ id: string; titre: string; date_start: string; date_end: string } | null> {
    let query = supabaseAdmin
        .from("publicites_premium")
        .select("id, titre, date_start, date_end")
        .eq("position", position)
        .eq("statut", "approuve")
        // chevauchement : start existant < fin nouvelle ET fin existant > start nouvelle
        .lt("date_start", dateEnd)
        .gt("date_end", dateStart);

    if (position === "banniere_categorie") {
        query = query.eq("categorie_id", categorieId);
    } else if (position === "banniere_boutique") {
        query = query.eq("boutique_id", boutiqueId);
    }

    if (excludeId) {
        query = query.neq("id", excludeId);
    }

    const { data } = await query.limit(1).maybeSingle();
    return data ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requirePermission(req, res, "publicites_premium.write");
        if (!auth) return;

        const body = schema.parse(req.body);

        const isAdmin = auth.profile.role === "Administrateur";
        const statut = isAdmin ? "approuve" : "en_attente";
        const approuveFields = isAdmin
            ? { approuve_par: auth.profile.id, approuve_le: new Date().toISOString() }
            : {};

        if (new Date(body.date_end) <= new Date(body.date_start)) {
            return res.status(400).json({ error: "La date de fin doit être après la date de début" });
        }

        if (body.position === "banniere_categorie" && !body.categorie_id) {
            return res.status(400).json({ error: "categorie_id requis pour la position banniere_categorie" });
        }

        if (isAdmin && body.position === "banniere_boutique" && !body.boutique_id) {
            return res.status(400).json({ error: "boutique_id requis pour la position banniere_boutique" });
        }

        const boutiqueId = isAdmin && body.boutique_id ? body.boutique_id : auth.profile.id;

        // Vérifier qu'aucune publicité approuvée n'occupe déjà cet emplacement sur ces dates
        const conflict = await findConflict(
            body.position,
            new Date(body.date_start).toISOString(),
            new Date(body.date_end).toISOString(),
            body.categorie_id,
            boutiqueId
        );

        if (conflict) {
            return res.status(409).json({
                error: "Cet emplacement est déjà occupé sur cette période",
                conflict: {
                    id: conflict.id,
                    titre: conflict.titre,
                    date_start: conflict.date_start,
                    date_end: conflict.date_end,
                },
            });
        }

        const { data, error } = await supabaseAdmin
            .from("publicites_premium")
            .insert({
                boutique_id: boutiqueId,
                position: body.position,
                titre: body.titre,
                url_image: body.url_image,
                lien: body.lien ?? null,
                description: body.description ?? null,
                date_start: new Date(body.date_start).toISOString(),
                date_end: new Date(body.date_end).toISOString(),
                categorie_id: body.categorie_id ?? null,
                prix: body.prix ?? null,
                statut,
                ...approuveFields,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("[campagnes-premium/create] insert error:", error);
            return res.status(500).json({
                error: "Impossible de créer la publicité premium",
                detail: error.message,
            });
        }

        return res.status(201).json({ publicite_premium: data });
    } catch (err) {
        if (err instanceof ZodError) return res.status(400).json({ errors: err.flatten() });
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
