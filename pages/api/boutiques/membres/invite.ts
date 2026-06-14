import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { z, ZodError } from "zod";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";
import { getSupabaseAdmin } from "../../../../app/lib/supabaseSafeAdmin";

const MAX_GERANTS_PAR_BOUTIQUE = 5;
const INVITE_EXPIRY_DAYS = 7;

const inviteSchema = z.object({
    email: z.string().email(),
});

/**
 * @swagger
 * /api/boutiques/membres/invite:
 *   post:
 *     tags: ["Boutique Membres"]
 *     summary: "Invite un gérant à rejoindre la boutique (proprio uniquement)"
 *     description: >
 *       Crée une invitation `pending` dans `boutique_membres`, génère un token,
 *       et envoie un email d'invitation via Supabase Auth. La cible est créée
 *       dans `auth.users` au moment de l'envoi (Supabase invite). L'invité
 *       complète son compte via la page `/invite/accept?token=...`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201: { description: "Invitation créée et email envoyé" }
 *       400: { description: "Email invalide ou déjà invité/membre" }
 *       403: { description: "Réservé au propriétaire de la boutique" }
 *       409: { description: "Capacité gérants atteinte" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const access = await requireBoutiqueAccess(req, res);
        if (!access) return;

        if (!access.isProprio) {
            return res.status(403).json({
                error: "Seul le propriétaire peut inviter un gérant",
            });
        }

        const { email } = inviteSchema.parse(req.body);
        const emailNormalized = email.trim().toLowerCase();

        const supabaseAdmin = getSupabaseAdmin();

        // 1️⃣ Garde anti-auto-invitation
        if (emailNormalized === access.auth.profile.email.toLowerCase()) {
            return res.status(400).json({
                error: "Vous ne pouvez pas vous inviter vous-même",
            });
        }

        // 2️⃣ Vérifie la capacité : compte les gérants actifs + pending
        const { count: nbGerants, error: countError } = await supabaseAdmin
            .from("boutique_membres")
            .select("id", { count: "exact", head: true })
            .eq("boutique_id", access.boutiqueId)
            .eq("role_membre", "gerant")
            .in("statut", ["active", "pending"]);

        if (countError) {
            console.error("[invite] count error:", countError);
            return res.status(500).json({ error: "Erreur serveur" });
        }

        if ((nbGerants ?? 0) >= MAX_GERANTS_PAR_BOUTIQUE) {
            return res.status(409).json({
                error: `Capacité atteinte : maximum ${MAX_GERANTS_PAR_BOUTIQUE} gérants par boutique`,
            });
        }

        // 3️⃣ Vérifie qu'il n'y a pas déjà une invitation/membership pour cet email
        const { data: existing } = await supabaseAdmin
            .from("boutique_membres")
            .select("id, statut")
            .eq("boutique_id", access.boutiqueId)
            .ilike("email", emailNormalized)
            .in("statut", ["pending", "active"])
            .maybeSingle();

        if (existing) {
            return res.status(400).json({
                error: existing.statut === "active"
                    ? "Cet utilisateur est déjà membre de votre boutique"
                    : "Une invitation est déjà en cours pour cet email",
            });
        }

        // 4️⃣ Vérifie que l'email n'est pas déjà membre actif d'une AUTRE boutique
        const { data: otherActive } = await supabaseAdmin
            .from("boutique_membres")
            .select("id")
            .ilike("email", emailNormalized)
            .eq("statut", "active")
            .maybeSingle();

        if (otherActive) {
            return res.status(400).json({
                error: "Cet email est déjà rattaché à une autre boutique",
            });
        }

        // 5️⃣ Génère token + expiration
        const inviteToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        // 6️⃣ Insère la ligne pending
        const { data: membre, error: insertError } = await supabaseAdmin
            .from("boutique_membres")
            .insert({
                boutique_id: access.boutiqueId,
                user_id: null,
                email: emailNormalized,
                role_membre: "gerant",
                statut: "pending",
                invite_token: inviteToken,
                expires_at: expiresAt.toISOString(),
                invited_by: access.auth.profile.id,
                invited_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError || !membre) {
            console.error("[invite] insert error:", insertError);
            return res.status(500).json({ error: "Impossible de créer l'invitation" });
        }

        // 7️⃣ Envoi de l'email via Supabase Auth Invite.
        // - Crée la ligne dans auth.users (sans password) → on stocke son `id`
        //   dans `auth_user_id` pour pouvoir y fixer le password au /join.
        // - Envoie un email de bienvenue avec le `redirectTo` (page d'atterrissage
        //   web — la finalisation se fait dans l'app Flutter via /join).
        // - En cas d'échec (SMTP rate limit, email déjà en auth.users…),
        //   l'invitation reste créée : le proprio peut partager le token
        //   manuellement via WhatsApp/SMS.
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${inviteToken}`;
        let emailSent = false;
        let emailError: string | null = null;
        let authUserId: string | null = null;

        try {
            const { data: inviteData, error: mailError } =
                await supabaseAdmin.auth.admin.inviteUserByEmail(emailNormalized, {
                    redirectTo: inviteUrl,
                    data: {
                        invite_type: "boutique_membre",
                        boutique_id: access.boutiqueId,
                        invite_token: inviteToken,
                    },
                });
            if (mailError) {
                emailError = mailError.message;
            } else {
                emailSent = true;
                authUserId = inviteData?.user?.id ?? null;
            }
        } catch (e) {
            emailError = e instanceof Error ? e.message : String(e);
        }

        // Persiste l'auth_user_id si récupéré (best-effort, n'affecte pas la réponse).
        if (authUserId) {
            await supabaseAdmin
                .from("boutique_membres")
                .update({ auth_user_id: authUserId })
                .eq("id", membre.id);
            (membre as Record<string, unknown>).auth_user_id = authUserId;
        }

        // ⚠️ Le `invite_token` est volontairement renvoyé ici car l'appelant
        // est le proprio qui l'a généré : il en a besoin pour le partager
        // manuellement à l'invité (WhatsApp, SMS…) si l'email n'arrive pas.
        // Cette exposition est SCOPÉE à la réponse de invite() — la lecture
        // ultérieure (GET /membres) ne le renvoie jamais.
        return res.status(201).json({
            membre,
            invite_token: inviteToken,
            invite_url: inviteUrl,
            email_sent: emailSent,
            email_error: emailError,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({ field: i.path[0], message: i.message })),
            });
        }
        console.error("[invite] error:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
