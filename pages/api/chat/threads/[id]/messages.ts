// pages/api/chat/threads/[id]/messages.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../../../../app/lib/supabaseAdmin";
import { requireUserAuth } from "../../../../../app/lib/middlewares/requireUserAuth";
import { resolveBoutiqueIdFor } from "../../../../../app/lib/middlewares/requireBoutiqueAccess";
import { notifyBoutiqueMembres } from "../../../../../app/lib/notifyBoutique";
import { envoyerPushFCM } from "../../../../../app/lib/sendPushFCM";
import {
    uploadChatImage,
    getChatImageSignedUrl,
} from "../../../../../lib/upload";
import { participantSlot, rolePrefix } from "../../../../../lib/chat";

// Body parser désactivé : POST en multipart/form-data (image optionnelle)
export const config = { api: { bodyParser: false } };

const MAX_LEN = 4000;

async function parseForm(req: NextApiRequest) {
    return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
        (resolve, reject) => {
            const form = formidable({
                multiples: false,
                maxFileSize: 5 * 1024 * 1024,
            });
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        }
    );
}

/**
 * @swagger
 * /api/chat/threads/{id}/messages:
 *   get:
 *     summary: Historique des messages d'un fil (participants uniquement)
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *   post:
 *     summary: Envoie un message (texte et/ou image)
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               contenu: { type: string }
 *               image: { type: string, format: binary }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const auth = await requireUserAuth(req, res);
    if (!auth) return;
    const { profile } = auth;

    const threadId = req.query.id as string;
    if (!threadId) {
        return res.status(400).json({ error: "Identifiant de discussion manquant" });
    }

    // Vérifie l'existence du fil ET l'appartenance de l'utilisateur
    const { data: thread, error: threadErr } = await supabaseAdmin
        .from("chat_threads")
        .select("*")
        .eq("id", threadId)
        .maybeSingle();

    if (threadErr || !thread) {
        return res.status(404).json({ error: "Discussion introuvable" });
    }

    // Phase 2 : pour un gérant Boutique, l'identité chat est le boutique_id.
    const boutiqueId = await resolveBoutiqueIdFor(profile.id, profile.role);
    const chatIdentity = boutiqueId ?? profile.id;

    const slot = participantSlot(thread, chatIdentity);
    if (!slot) {
        return res
            .status(403)
            .json({ error: "Accès refusé : vous ne participez pas à cette discussion" });
    }

    // ---------- HISTORIQUE ----------
    if (req.method === "GET") {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = (page - 1) * limit;

        const { data: messages, error, count } = await supabaseAdmin
            .from("chat_messages")
            .select("*", { count: "exact" })
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Erreur historique messages:", error);
            return res.status(500).json({ error: "Impossible de charger les messages" });
        }

        // Bucket privé : génère une URL signée pour chaque image
        const withUrls = await Promise.all(
            (messages ?? []).map(async (m) => ({
                ...m,
                image_url: m.image_url
                    ? await getChatImageSignedUrl(m.image_url)
                    : null,
            }))
        );

        return res.status(200).json({
            messages: withUrls,
            pagination: {
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit),
            },
        });
    }

    // ---------- ENVOI ----------
    if (req.method === "POST") {
        try {
            const { fields, files } = await parseForm(req);

            const rawContenu = Array.isArray(fields.contenu)
                ? fields.contenu[0]
                : fields.contenu;
            const contenu = (rawContenu ?? "").trim();

            const fileEntry = files.image
                ? Array.isArray(files.image)
                    ? files.image[0]
                    : files.image
                : null;

            if (!contenu && !fileEntry) {
                return res
                    .status(400)
                    .json({ error: "Message vide : texte ou image requis" });
            }
            if (contenu.length > MAX_LEN) {
                return res
                    .status(400)
                    .json({ error: `Message trop long (max ${MAX_LEN} caractères)` });
            }

            const messageId = uuidv4();
            let imagePath: string | null = null;

            if (fileEntry) {
                const f = fileEntry as FormidableFile;
                const buffer = fs.readFileSync(f.filepath);
                const imageFile = new File(
                    [buffer],
                    f.originalFilename || "image.jpg",
                    { type: f.mimetype || "image/jpeg" }
                );
                const token = req.headers.authorization?.replace("Bearer ", "");
                const up = await uploadChatImage(
                    imageFile,
                    threadId,
                    messageId,
                    token
                );
                fs.unlinkSync(f.filepath);

                if (!up.success || !up.path) {
                    return res
                        .status(400)
                        .json({ error: up.error || "Échec de l'envoi de l'image" });
                }
                imagePath = up.path;
            }

            // sender_id = identité chat : pour un gérant, on enregistre le
            // boutique_id (=proprio) comme expéditeur — le client/interlocuteur
            // voit toujours « la boutique » comme expéditeur, peu importe quel
            // gérant a tapé. La traçabilité interne (qui a tapé) peut être
            // ajoutée plus tard via une colonne sender_user_id.
            const { data: message, error: insertErr } = await supabaseAdmin
                .from("chat_messages")
                .insert({
                    id: messageId,
                    thread_id: threadId,
                    sender_id: chatIdentity,
                    contenu: contenu || null,
                    image_url: imagePath,
                    is_read: false,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertErr) {
                console.error("Erreur insertion message:", insertErr);
                return res.status(500).json({ error: "Impossible d'envoyer le message" });
            }

            // Notification au destinataire
            const otherId =
                thread.participant_a_id === chatIdentity
                    ? thread.participant_b_id
                    : thread.participant_a_id;

            const { data: other } = await supabaseAdmin
                .from("users")
                .select("role")
                .eq("id", otherId)
                .maybeSingle();

            const apercu = contenu
                ? contenu.length > 100
                    ? `${contenu.substring(0, 97)}...`
                    : contenu
                : "📷 Image";

            // Phase 2 : si le destinataire est une boutique, on fan-out aux
            // gérants actifs (sinon l'un d'eux raterait les messages clients).
            // Pour les autres rôles, un seul insert direct sur le user_id.
            const notifPayload = {
                type: "Message",
                titre: `Nouveau message de ${profile.name}`,
                message: apercu,
                lien: `${rolePrefix(other?.role ?? "Client")}/messages?thread=${threadId}`,
            };
            if (other?.role === "Boutique") {
                // notifyBoutiqueMembres diffuse déjà in-app + push aux gérants.
                await notifyBoutiqueMembres(otherId, notifPayload);
            } else {
                // Client, Livreur, Admin : insert in-app + push FCM direct.
                await supabaseAdmin.from("notifications").insert({
                    user_id: otherId,
                    ...notifPayload,
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
                await envoyerPushFCM([otherId], notifPayload);
            }

            return res.status(201).json({
                message: {
                    ...message,
                    image_url: imagePath
                        ? await getChatImageSignedUrl(imagePath)
                        : null,
                },
            });
        } catch (err: any) {
            console.error("Error POST /api/chat/threads/[id]/messages:", err);
            return res.status(500).json({ error: "Erreur serveur interne" });
        }
    }

    return res.status(405).json({ error: "Méthode non autorisée" });
}
