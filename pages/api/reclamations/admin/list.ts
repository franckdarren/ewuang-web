// pages/api/reclamations/admin/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/reclamations/admin/list:
 *   get:
 *     summary: Liste toutes les réclamations (admin)
 *     description: Récupère toutes les réclamations avec les informations client et commande. Accessible uniquement aux administrateurs.
 *     tags:
 *       - Réclamations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste renvoyée
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé (admin seulement)
 *       500:
 *         description: Erreur serveur
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    if (profile.role !== "Administrateur") {
        return res.status(403).json({ error: "Accès refusé. Administrateur requis." });
    }

    const { data, error } = await supabaseAdmin
        .from("reclamations")
        .select(`
            *,
            users!reclamations_user_id_fkey (id, name, email, phone),
            commandes (id, numero, statut, prix)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: "Impossible de récupérer les réclamations" });
    }

    return res.status(200).json({ reclamations: data });
}
