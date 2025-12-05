// pages/api/commandes/[id]/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/commandes/{id}/update-status:
 *   patch:
 *     summary: Met à jour le statut d'une commande
 *     description: >
 *       Change le statut d'une commande. Accessible uniquement aux administrateurs
 *       ou aux boutiques propriétaires des articles de la commande.
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum:
 *                   - En attente
 *                   - En preparation
 *                   - Prete pour livraison
 *                   - En cours de livraison
 *                   - Livrée
 *                   - Annulée
 *                   - Remboursée
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
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

const updateStatusSchema = z.object({
    statut: z.enum([
        "En attente",
        "En préparation",
        "Prête pour livraison",
        "En cours de livraison",
        "Livrée",
        "Annulée",
        "Remboursée",
    ]),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "ID de commande invalide" });
        }

        const body = updateStatusSchema.parse(req.body);

        // Récupérer la commande avec ses articles
        const { data: commande, error: fetchError } = await supabaseAdmin
            .from("commandes")
            .select(`
        *,
        commande_articles (
            articles (user_id)
        )
        `)
            .eq("id", id)
            .single();

        if (fetchError || !commande) {
            return res.status(404).json({ error: "Commande introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isOwner = commande.user_id === profile.id;

        // Vérifier si l'utilisateur est propriétaire d'au moins un article de la commande
        const isBoutiqueOwner = commande.commande_articles?.some(
            (ca: any) => ca.articles?.user_id === profile.id
        );

        if (!isAdmin && !isOwner && !isBoutiqueOwner) {
            return res.status(403).json({ error: "Accès refusé pour modifier cette commande" });
        }

        // Mettre à jour le statut
        const { data: updatedCommande, error: updateError } = await supabaseAdmin
            .from("commandes")
            .update({
                statut: body.statut,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select(`
        *,
        users!commandes_user_id_fkey (id, name, email),
        commande_articles (
          *,
            articles (id, nom),
            variations (id, couleur, taille)
        )
        `)
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Impossible de mettre à jour le statut" });
        }

        return res.status(200).json({
            message: "Statut mis à jour avec succès",
            commande: updatedCommande,
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
        console.error("Error /api/commandes/[id]/update-status:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}