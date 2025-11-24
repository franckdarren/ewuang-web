import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";
import { getSupabaseAdmin } from "../../../app/lib/supabaseSafeAdmin";
import { getSupabaseClient } from "../../../app/lib/supabaseSafeClient";

// Schema de modification
const updateSchema = z.object({
    name: z.string().min(3).optional(),
    address: z.string().optional(),
    url_logo: z.string().optional(),
    phone: z.string().optional(),
    heure_ouverture: z.string().optional(),
    heure_fermeture: z.string().optional(),
    description: z.string().optional(),
});

/**
 * @swagger
 * /api/users/update:
 *   patch:
 *     summary: "Met à jour le profil de l'utilisateur connecté"
 *     description: >
 *       Met à jour les informations du profil de l'utilisateur connecté dans la table `public.users`. La route est sécurisée et nécessite un token Bearer valide.
 *     tags: ["Users"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Yaya Nills"
 *               address:
 *                 type: string
 *                 example: "Libreville, Gabon"
 *               url_logo:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *               phone:
 *                 type: string
 *                 example: "+24100000000"
 *               heure_ouverture:
 *                 type: string
 *                 example: "08:00"
 *               heure_fermeture:
 *                 type: string
 *                 example: "18:00"
 *               description:
 *                 type: string
 *                 example: "Ma boutique de produits"
 *     responses:
 *       200:
 *         description: "Profil mis à jour avec succès"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       400:
 *         description: "Données invalides"
 *       401:
 *         description: "Non autorisé, token manquant ou invalide"
 *       403:
 *         description: "Accès interdit : utilisateur non trouvé"
 *       500:
 *         description: "Erreur serveur"
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        // 🔐 Middleware : vérifie token + utilisateur
        const auth = await requireUserAuth(req, res);
        if (!auth) return; // réponse déjà envoyée si non autorisé

        const { auth_id } = auth;

        // 1️⃣ Valider les champs envoyés
        const body = updateSchema.parse(req.body);

        // 2️⃣ Mettre à jour uniquement le profil de l'utilisateur connecté
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
            .from("users")
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq("auth_id", auth_id)
            .select()
            .single();

        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Impossible de mettre à jour le profil" });
        }

        return res.status(200).json({ user: data });

    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path[0],
                    message: i.message,
                })),
            });
        }

        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
