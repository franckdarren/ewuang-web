// pages/api/commandes/[id]/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { resolveBoutiqueIdFor } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import { envoyerPushFCM } from "../../../../app/lib/sendPushFCM";
import { findLivreurDuGroupe } from "../../../../app/lib/livraisonsGroupe";

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
        // Phase 2 : pour un compte Boutique, on résout son boutique_id (proprio
        // OU gérant accède aux mêmes commandes). isOwner couvre l'acheteur.
        const isAdmin = profile.role === "Administrateur";
        const isOwner = commande.user_id === profile.id;
        const boutiqueId = await resolveBoutiqueIdFor(profile.id, profile.role);
        // Multi-boutiques : chaque sous-commande appartient à UNE boutique
        // (vendeur_id) → une boutique ne peut piloter que SA sous-commande.
        // Repli sur la propriété des articles pour les anciennes commandes
        // créées avant la migration (vendeur_id encore null).
        const isBoutiqueOwner =
            boutiqueId !== null &&
            (commande.vendeur_id === boutiqueId ||
                (commande.vendeur_id == null &&
                    commande.commande_articles?.some(
                        (ca: any) => ca.articles?.user_id === boutiqueId
                    )));

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

        // 🔁 Synchronisation statut livraison (sens commande → livraison)
        // Cas couverts : Annulée, Remboursée, En cours de livraison, Livrée.
        // Règle : on ne réécrit jamais une livraison déjà "Livrée".
        const livraisonStatutMap: Record<string, string> = {
            "En cours de livraison": "En cours de livraison",
            "Livrée": "Livrée",
            "Annulée": "Annulée",
            "Remboursée": "Annulée",
        };
        const livraisonCibleStatut = livraisonStatutMap[body.statut];

        if (livraisonCibleStatut) {
            try {
                const { data: livraison } = await supabaseAdmin
                    .from("livraisons")
                    .select("id, statut, livreur_id")
                    .eq("commande_id", id)
                    .maybeSingle();

                if (livraison && livraison.statut !== "Livrée" && livraison.statut !== livraisonCibleStatut) {
                    await supabaseAdmin
                        .from("livraisons")
                        .update({
                            statut: livraisonCibleStatut,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", livraison.id);

                    // 🔔 Notifier le livreur en cas d'annulation / remboursement
                    if (
                        livraison.livreur_id &&
                        (body.statut === "Annulée" || body.statut === "Remboursée")
                    ) {
                        const notif = {
                            type: "Livraison",
                            titre: body.statut === "Annulée"
                                ? "Livraison annulée"
                                : "Livraison annulée (remboursement)",
                            message: body.statut === "Annulée"
                                ? `La commande #${updatedCommande.numero} a été annulée. La livraison est interrompue.`
                                : `La commande #${updatedCommande.numero} a été remboursée. La livraison est interrompue.`,
                            lien: "/livraisons",
                        };

                        await supabaseAdmin.from("notifications").insert({
                            user_id: livraison.livreur_id,
                            ...notif,
                            is_read: false,
                            created_at: new Date().toISOString(),
                        });

                        await envoyerPushFCM([livraison.livreur_id], notif);
                    }
                }
            } catch (syncError) {
                console.error("Erreur sync statut livraison:", syncError);
            }
        }

        // Commande prête à être récupérée : soit auto-attribution au livreur qui
        // tient déjà une autre boutique de la même commande groupée, soit
        // broadcast classique à toute la flotte si personne n'a encore réclamé.
        if (body.statut === "Prête pour livraison") {
            const { data: livraisonActuelle } = await supabaseAdmin
                .from("livraisons")
                .select("id, statut, livreur_id")
                .eq("commande_id", id)
                .maybeSingle();

            // Idempotence : déjà assignée (cascade précédente ou acceptation
            // directe), rien à refaire.
            const dejaAssignee = !!livraisonActuelle?.livreur_id;

            let livreurDuGroupe: string | null = null;
            if (!dejaAssignee && updatedCommande.groupe_id && livraisonActuelle) {
                livreurDuGroupe = await findLivreurDuGroupe(updatedCommande.groupe_id, id);
            }

            if (!dejaAssignee && livreurDuGroupe && livraisonActuelle) {
                // 🔗 Auto-attribution : une autre boutique de cette commande a déjà
                // été acceptée par ce livreur. Pas de mise en pool, notif ciblée.
                await supabaseAdmin
                    .from("livraisons")
                    .update({
                        livreur_id: livreurDuGroupe,
                        statut: "En cours de livraison",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", livraisonActuelle.id)
                    .is("livreur_id", null);

                await supabaseAdmin
                    .from("commandes")
                    .update({ statut: "En cours de livraison", updated_at: new Date().toISOString() })
                    .eq("id", id);

                const notif = {
                    type: "Livraison",
                    titre: "Nouvelle boutique prête",
                    message: `Une autre boutique de la commande #${updatedCommande.numero} est prête à être récupérée.`,
                    lien: "/livraisons",
                };
                await supabaseAdmin.from("notifications").insert({
                    user_id: livreurDuGroupe,
                    ...notif,
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
                await envoyerPushFCM([livreurDuGroupe], notif, { channelId: "livraisons" });

                return res.status(200).json({
                    message: "Statut mis à jour avec succès",
                    commande: { ...updatedCommande, statut: "En cours de livraison" },
                });
            }

            const { data: livreurs } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("role", "Livreur")
                .eq("is_active", true);

            if (livreurs && livreurs.length > 0) {
                const notif = {
                    type: "Livraison",
                    titre: "Nouvelle livraison disponible",
                    message: `La commande #${updatedCommande.numero} est prête et attend un livreur.`,
                    lien: "/livraisons",
                };
                const livreurIds = livreurs.map((l: { id: string }) => l.id);

                // Notifications in-app (Supabase Realtime)
                await supabaseAdmin.from("notifications").insert(
                    livreurIds.map((id: string) => ({
                        user_id: id,
                        ...notif,
                        is_read: false,
                        created_at: new Date().toISOString(),
                    }))
                );

                // Push FCM (multi-device + purge tokens morts via le helper)
                await envoyerPushFCM(livreurIds, notif, { channelId: "livraisons" });
            }
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