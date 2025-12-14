// pages/api/livraisons/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/create:
 *   post:
 *     summary: Crée une nouvelle livraison
 *     description: >
 *       Crée une livraison pour une commande. Accessible aux administrateurs
 *       ou aux boutiques propriétaires des articles de la commande.
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commande_id
 *               - adresse
 *               - ville
 *               - phone
 *               - date_livraison
 *             properties:
 *               commande_id:
 *                 type: string
 *                 format: uuid
 *               adresse:
 *                 type: string
 *                 maxLength: 255
 *               details:
 *                 type: string
 *                 maxLength: 255
 *               ville:
 *                 type: string
 *                 maxLength: 255
 *               phone:
 *                 type: string
 *                 maxLength: 255
 *               date_livraison:
 *                 type: string
 *                 format: date-time
 *               statut:
 *                 type: string
 *                 maxLength: 255
 *                 default: "En attente"
 *                 enum:
 *                   - En attente
 *                   - En cours de livraison
 *                   - Livrée
 *                   - Annulée
 *                   - Reportée
 *     responses:
 *       201:
 *         description: Livraison créée avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Commande introuvable
 *       500:
 *         description: Erreur serveur
 */

const createLivraisonSchema = z.object({
    commande_id: z.string().uuid(),
    adresse: z.string().max(255).min(1),
    details: z.string().max(255).optional().default(""),
    ville: z.string().max(255).min(1),
    phone: z.string().max(255).min(1),
    date_livraison: z.string().datetime(),
    statut: z.string().max(255).optional().default("En attente"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = createLivraisonSchema.parse(req.body);

        // Vérifier que la commande existe
        const { data: commande, error: commandeError } = await supabaseAdmin
            .from("commandes")
            .select(`
        id,
        user_id,
        numero,
        statut,
        commande_articles (
          articles (user_id)
        )
      `)
            .eq("id", body.commande_id)
            .single();

        if (commandeError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isBoutiqueOwner = commande.commande_articles?.some(
            (ca: any) => ca.articles?.user_id === profile.id
        );

        if (!isAdmin && !isBoutiqueOwner) {
            return res.status(403).json({
                error: "Accès refusé. Seuls les admins ou les boutiques concernées peuvent créer une livraison"
            });
        }

        // Vérifier qu'il n'existe pas déjà une livraison pour cette commande
        const { data: existingLivraison } = await supabaseAdmin
            .from("livraisons")
            .select("id")
            .eq("commande_id", body.commande_id)
            .single();

        if (existingLivraison) {
            return res.status(400).json({
                error: "Une livraison existe déjà pour cette commande"
            });
        }

        // Créer la livraison
        const { data: livraison, error: insertError } = await supabaseAdmin
            .from("livraisons")
            .insert({
                commande_id: body.commande_id,
                user_id: commande.user_id,   // ✅ acheteur
                livreur_id: null,
                adresse: body.adresse,
                details: body.details,
                ville: body.ville,
                phone: body.phone,
                date_livraison: body.date_livraison,
                statut: body.statut,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select(`
        *,
        commandes (id, numero, statut, prix, user_id),
        users (id, name, email, phone)
      `)
            .single();

        if (insertError) {
            console.error("Supabase insert error:", insertError);
            return res.status(500).json({ error: "Impossible de créer la livraison" });
        }

        // Mettre à jour le statut de la commande si nécessaire
        if (commande.statut === "En attente" || commande.statut === "en_preparation") {
            await supabaseAdmin
                .from("commandes")
                .update({ statut: "prete_pour_livraison" })
                .eq("id", body.commande_id);
        }

        return res.status(201).json({
            message: "Livraison créée avec succès",
            livraison,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/livraisons/create:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}