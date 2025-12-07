// pages/api/livraisons/[id]/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/livraisons/{id}/update:
 *   patch:
 *     summary: Met à jour une livraison
 *     description: >
 *       Permet de modifier les informations d'une livraison.
 *       Accessible aux administrateurs ou au livreur assigné.
 *     tags:
 *       - Livraisons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la livraison
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *     responses:
 *       200:
 *         description: Livraison mise à jour avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non autorisé
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livraison introuvable
 *       500:
 *         description: Erreur serveur
 */

const updateLivraisonSchema = z.object({
    adresse: z.string().max(255).min(1).optional(),
    details: z.string().max(255).optional(),
    ville: z.string().max(255).min(1).optional(),
    phone: z.string().max(255).min(1).optional(),
    date_livraison: z.string().datetime().optional(),
    statut: z.string().max(255).optional(),
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
            return res.status(400).json({ error: "ID de livraison invalide" });
        }

        const body = updateLivraisonSchema.parse(req.body);

        // Vérifier qu'il y a au moins un champ à mettre à jour
        if (Object.keys(body).length === 0) {
            return res.status(400).json({
                error: "Au moins un champ doit être fourni pour la mise à jour"
            });
        }

        // Vérifier que la livraison existe
        const { data: livraison, error: fetchError } = await supabaseAdmin
            .from("livraisons")
            .select("*, commandes (statut)")
            .eq("id", id)
            .single();

        if (fetchError || !livraison) {
            return res.status(404).json({ error: "Livraison introuvable" });
        }

        // Vérifier les permissions
        const isAdmin = profile.role === "Administrateur";
        const isLivreur = livraison.user_id === profile.id;

        if (!isAdmin && !isLivreur) {
            return res.status(403).json({
                error: "Seuls les admins ou le livreur assigné peuvent modifier cette livraison"
            });
        }

        // Construire l'objet de mise à jour
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (body.adresse) updateData.adresse = body.adresse;
        if (body.details !== undefined) updateData.details = body.details;
        if (body.ville) updateData.ville = body.ville;
        if (body.phone) updateData.phone = body.phone;
        if (body.date_livraison) updateData.date_livraison = body.date_livraison;
        if (body.statut) updateData.statut = body.statut;

        // Mettre à jour la livraison
        const { data: updatedLivraison, error: updateError } = await supabaseAdmin
            .from("livraisons")
            .update(updateData)
            .eq("id", id)
            .select(`
        *,
        commandes (id, numero, statut, prix),
        users (id, name, email, phone)
      `)
            .single();

        if (updateError) {
            console.error("Supabase update error:", updateError);
            return res.status(500).json({ error: "Impossible de mettre à jour la livraison" });
        }

        // Si le statut de la livraison change, mettre à jour le statut de la commande
        if (body.statut) {
            let commandeStatut = null;

            if (body.statut.toLowerCase().includes("livr")) {
                commandeStatut = "livree";
            } else if (body.statut.toLowerCase().includes("cours")) {
                commandeStatut = "en_cours_de_livraison";
            }

            if (commandeStatut) {
                await supabaseAdmin
                    .from("commandes")
                    .update({ statut: commandeStatut })
                    .eq("id", livraison.commande_id);
            }
        }

        return res.status(200).json({
            message: "Livraison mise à jour avec succès",
            livraison: updatedLivraison,
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
        console.error("Error /api/livraisons/[id]/update:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}