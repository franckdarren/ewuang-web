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
 *     description: Supprime un article et (optionnel) ses variations et images associées.
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

        // delete variations -> image_articles (cascade if cascade in DB would be automatic)
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
            console.error("Erreur deletion article:", delErr);
            return res.status(500).json({ error: "Impossible de supprimer l'article" });
        }

        return res.status(200).json({ message: "Article supprimé" });
    } catch (err) {
        console.error("Error /api/articles/delete:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
