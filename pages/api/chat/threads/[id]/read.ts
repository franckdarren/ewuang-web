// pages/api/chat/threads/[id]/read.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../../app/lib/middlewares/requireUserAuth";
import { participantSlot } from "../../../../../lib/chat";

/**
 * @swagger
 * /api/chat/threads/{id}/read:
 *   post:
 *     summary: Marque comme lus les messages reçus dans un fil
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Fil marqué comme lu }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const threadId = req.query.id as string;
    if (!threadId) {
        return res.status(400).json({ error: "Identifiant de discussion manquant" });
    }

    const { data: thread, error: threadErr } = await supabaseAdmin
        .from("chat_threads")
        .select("id, participant_a_id, participant_b_id")
        .eq("id", threadId)
        .maybeSingle();

    if (threadErr || !thread) {
        return res.status(404).json({ error: "Discussion introuvable" });
    }

    const slot = participantSlot(thread, profile.id);
    if (!slot) {
        return res
            .status(403)
            .json({ error: "Accès refusé : vous ne participez pas à cette discussion" });
    }

    // Réinitialise mon compteur de non-lus
    await supabaseAdmin
        .from("chat_threads")
        .update(
            slot === "a" ? { unread_count_a: 0 } : { unread_count_b: 0 }
        )
        .eq("id", threadId);

    // Marque comme lus les messages envoyés par l'autre participant
    await supabaseAdmin
        .from("chat_messages")
        .update({ is_read: true })
        .eq("thread_id", threadId)
        .neq("sender_id", profile.id)
        .eq("is_read", false);

    return res.status(200).json({ ok: true });
}
