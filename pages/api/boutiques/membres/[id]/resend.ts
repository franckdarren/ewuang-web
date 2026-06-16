import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { requireBoutiqueAccess } from "../../../../../app/lib/middlewares/requireBoutiqueAccess";
import { getSupabaseAdmin } from "../../../../../app/lib/supabaseSafeAdmin";

const INVITE_EXPIRY_DAYS = 7;

/**
 * @swagger
 * /api/boutiques/membres/{id}/resend:
 *   post:
 *     tags: ["Boutique Membres"]
 *     summary: "Renvoie l'email d'invitation d'un membre pending (proprio uniquement)"
 *     description: >
 *       Régénère le token + la date d'expiration d'une invitation `pending`
 *       et renvoie l'email Supabase Auth. N'a aucun effet sur les membres
 *       déjà actifs ou révoqués.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: "Invitation renvoyée" }
 *       400: { description: "Le membre n'est pas en attente" }
 *       403: { description: "Réservé au propriétaire de la boutique" }
 *       404: { description: "Membre introuvable" }
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
                error: "Seul le propriétaire peut renvoyer une invitation",
            });
        }

        const { id } = req.query;
        if (typeof id !== "string") {
            return res.status(400).json({ error: "ID invalide" });
        }

        const supabaseAdmin = getSupabaseAdmin();

        const { data: membre, error: loadError } = await supabaseAdmin
            .from("boutique_membres")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (loadError || !membre) {
            return res.status(404).json({ error: "Membre introuvable" });
        }

        if (membre.boutique_id !== access.boutiqueId) {
            return res.status(404).json({ error: "Membre introuvable" });
        }

        if (membre.statut !== "pending") {
            return res.status(400).json({
                error: "Seules les invitations en attente peuvent être renvoyées",
            });
        }

        const inviteToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        const { data: updated, error: updateError } = await supabaseAdmin
            .from("boutique_membres")
            .update({
                invite_token: inviteToken,
                expires_at: expiresAt.toISOString(),
                invited_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError || !updated) {
            console.error("[resend] update error:", updateError);
            return res.status(500).json({ error: "Impossible de renvoyer l'invitation" });
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${inviteToken}`;
        let emailSent = false;
        let emailError: string | null = null;
        let authUserId: string | null = null;

        // Le compte `auth.users` est créé dès le premier envoi (invite.ts ou un
        // précédent resend). Rappeler `inviteUserByEmail` pour ce même email
        // échoue alors systématiquement avec "User already registered" — ce
        // n'est pas une erreur, c'est le comportement normal de l'API Supabase.
        // On ne tente l'appel que si aucun compte n'a encore été créé ; sinon
        // on se contente de régénérer le token et on informe le proprio qu'il
        // doit partager le lien manuellement.
        if (membre.auth_user_id) {
            emailError = "Le lien d'invitation a été régénéré. Le compte existe déjà : partagez-le manuellement (WhatsApp, SMS…) plutôt que de renvoyer l'email automatique.";
        } else {
            try {
                const { data: inviteData, error: mailError } =
                    await supabaseAdmin.auth.admin.inviteUserByEmail(membre.email, {
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
        }

        if (authUserId) {
            await supabaseAdmin
                .from("boutique_membres")
                .update({ auth_user_id: authUserId })
                .eq("id", id);
            (updated as Record<string, unknown>).auth_user_id = authUserId;
        }

        return res.status(200).json({
            membre: updated,
            invite_token: inviteToken,
            invite_url: inviteUrl,
            email_sent: emailSent,
            email_error: emailError,
        });
    } catch (err) {
        console.error("[resend] error:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
