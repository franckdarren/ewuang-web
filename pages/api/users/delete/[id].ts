import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../app/lib/middlewares/requireUserAuth";
import { getSupabaseAdmin } from "../../../../app/lib/supabaseSafeAdmin";

/**
 * @swagger
 * /api/users/delete/{id}:
 *   delete:
 *     summary: Supprime un utilisateur (auth + public)
 *     description: >
 *       Supprime un utilisateur spécifique dans la table `public.users` ainsi que dans `auth.users`. La route est sécurisée et nécessite un token Bearer valide.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (auth_id)
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE")
        return res.status(405).json({ error: "Méthode non autorisée" });

    const auth = await requireUserAuth(req, res);
    if (!auth) return;

    const { id } = req.query;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "ID utilisateur manquant ou invalide" });

    try {
        const supabaseAdmin = getSupabaseAdmin();

        // 1️⃣ Récupérer l'utilisateur cible
        const { data: user, error: userError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("id", auth.user.id)
            .single();

        if (userError || !user) return res.status(404).json({ error: "Utilisateur introuvable" });

        // 2️⃣ Supprimer dans auth.users si auth_id existe
        if (user.auth_id) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
            if (authError) console.warn("Impossible de supprimer auth_user:", authError.message);
        }

        // 3️⃣ Supprimer dans public.users
        const { error: deleteError } = await supabaseAdmin
            .from("users")
            .delete()
            .eq("id", auth.user.id);

        if (deleteError) return res.status(500).json({ error: "Impossible de supprimer l'utilisateur dans public.users" });

        return res.status(200).json({ message: "Utilisateur supprimé avec succès" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }

}