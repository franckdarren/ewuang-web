import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { supabaseAdmin } from "../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../app/lib/middlewares/requireUserAuth";

/**
 * @swagger
 * /api/conversations/send:
 *   post:
 *     summary: Envoie un message
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver_id
 *               - message
 *             properties:
 *               receiver_id:
 *                 type: string
 *               message:
 *                 type: string
 */

const sendSchema = z.object({
    receiver_id: z.string().uuid(),
    message: z.string().min(1).max(2000),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Méthode non autorisée" });

    try {
        const auth = await requireUserAuth(req, res);
        if (!auth) return;
        const { profile } = auth;

        const body = sendSchema.parse(req.body);

        if (body.receiver_id === profile.id) {
            return res.status(400).json({ error: "Vous ne pouvez pas vous envoyer un message" });
        }

        // Vérifier le destinataire
        const { data: destinataire, error: destErr } = await supabaseAdmin
            .from("users")
            .select("id, name, email")
            .eq("id", body.receiver_id)
            .single();

        if (destErr || !destinataire) {
            return res.status(404).json({ error: "Destinataire introuvable" });
        }

        // Créer le message
        const { data: message, error: insertErr } = await supabaseAdmin
            .from("conversations")
            .insert({
                sender_id: profile.id,
                receiver_id: body.receiver_id,
                message: body.message.trim(),
                is_read: false,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertErr) {
            console.error("Erreur envoi message:", insertErr);
            return res.status(500).json({ error: "Impossible d'envoyer le message" });
        }

        // Créer notification
        await supabaseAdmin
            .from("notifications")
            .insert({
                user_id: body.receiver_id,
                type: "message",
                titre: `Nouveau message de ${profile.name}`,
                message: body.message.length > 100 ? `${body.message.substring(0, 97)}...` : body.message,
                lien: `/conversations/${profile.id}`,
                is_read: false,
                created_at: new Date().toISOString(),
            });

        return res.status(201).json({ message });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            });
        }
        console.error("Error /api/conversations/send:", err);
        return res.status(500).json({ error: "Erreur serveur interne" });
    }
}