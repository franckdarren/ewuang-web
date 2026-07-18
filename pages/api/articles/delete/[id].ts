// pages/api/articles/delete/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import { deleteArticleVideo } from "../../../../lib/upload";

/**
 * @swagger
 * /api/articles/delete/{id}:
 *   delete:
 *     summary: Supprime un article (propriétaire uniquement)
 *     description: |
 *       Supprime un article ainsi que ses variations et images associées.
 *       Si l'article a déjà été commandé, il est **archivé** (`is_active = false`)
 *       au lieu d'être supprimé, afin de préserver l'historique des commandes.
 *       La réponse contient alors `archived: true`.
 *     tags: [Articles]
 *     security: [ { bearerAuth: [] } ]
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        const { id } = req.query;
        if (!id || typeof id !== "string") return res.status(400).json({ error: "ID article manquant" });

        const { data: article, error: findErr } = await supabaseAdmin.from("articles").select("*").eq("id", id).single();
        if (findErr || !article) return res.status(404).json({ error: "Article introuvable" });
        if (article.user_id !== access.boutiqueId) return res.status(403).json({ error: "Accès refusé : cet article n'appartient pas à votre boutique" });

        // Un article déjà commandé ne peut pas être supprimé : les lignes de
        // commande le référencent (FK sans ON DELETE CASCADE, volontairement,
        // pour ne pas détruire l'historique). On l'archive à la place.
        const [{ count: nbLignes, error: errLignes }, { count: nbLignesLegacy, error: errLignesLegacy }] =
            await Promise.all([
                supabaseAdmin.from("commande_articles").select("id", { count: "exact", head: true }).eq("article_id", id),
                supabaseAdmin.from("article_commandes").select("id", { count: "exact", head: true }).eq("article_id", id),
            ]);

        if (errLignes || errLignesLegacy) {
            console.error("Erreur vérification des commandes liées:", errLignes ?? errLignesLegacy);
            return res.status(500).json({ error: "Impossible de supprimer l'article" });
        }

        if ((nbLignes ?? 0) > 0 || (nbLignesLegacy ?? 0) > 0) {
            const { error: archiveErr } = await supabaseAdmin
                .from("articles")
                .update({ is_active: false })
                .eq("id", id);

            if (archiveErr) {
                console.error("Erreur archivage article:", archiveErr);
                return res.status(500).json({ error: "Impossible de supprimer l'article" });
            }

            return res.status(200).json({
                message: "Article archivé : il a déjà été commandé et reste visible dans l'historique des commandes",
                archived: true,
            });
        }

        // Aucune commande liée → suppression définitive.
        // favoris, avis, panier_items et codes_promo sont en ON DELETE CASCADE ;
        // image_articles et variations ne le sont pas, on les supprime ici.
        await supabaseAdmin.from("image_articles").delete().eq("article_id", id);
        await supabaseAdmin.from("variations").delete().eq("article_id", id);

        // Nettoyage best-effort de la vidéo promotionnelle associée
        if (article.video_url) {
            await deleteArticleVideo(article.user_id, id).catch((err) =>
                console.warn("Impossible de supprimer la vidéo de l'article :", err)
            );
        }

        const { error: delErr } = await supabaseAdmin.from("articles").delete().eq("id", id);
        if (delErr) {
            // Filet de sécurité : une autre table référence encore l'article
            // (course avec une commande créée entre-temps, ou FK non anticipée).
            if (delErr.code === "23503") {
                const { error: archiveErr } = await supabaseAdmin
                    .from("articles")
                    .update({ is_active: false })
                    .eq("id", id);

                if (!archiveErr) {
                    return res.status(200).json({
                        message: "Article archivé : il est encore référencé par d'autres données",
                        archived: true,
                    });
                }
                console.error("Erreur archivage article (fallback):", archiveErr);
            }

            console.error("Erreur deletion article:", delErr);
            return res.status(500).json({ error: "Impossible de supprimer l'article" });
        }

        return res.status(200).json({ message: "Article supprimé", archived: false });
    } catch (err) {
        console.error("Error /api/articles/delete:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
