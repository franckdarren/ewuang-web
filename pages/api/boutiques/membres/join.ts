import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import { z, ZodError } from "zod";
import { getSupabaseAdmin } from "../../../../app/lib/supabaseSafeAdmin";

const joinSchema = z.object({
    token: z.string().min(32).max(64),
    owner_name: z.string().min(2),  // nom personnel du gérant (affiché dans "Bonjour …")
    password: z.string().min(6),     // mot de passe choisi par le gérant
    phone: z.string().optional(),
});

/**
 * @swagger
 * /api/boutiques/membres/join:
 *   post:
 *     tags: ["Boutique Membres"]
 *     summary: "Rejoint une boutique via un token d'invitation (anonyme)"
 *     description: >
 *       Endpoint anonyme : pas de Bearer requis. Appelé depuis l'app Flutter
 *       quand l'invité saisit son token + son nom + son mot de passe.
 *
 *       Effectue tout en une fois :
 *       1. Valide le token (pending + non expiré).
 *       2. Récupère / crée le compte Supabase Auth (réutilise `auth_user_id`
 *          si présent — créé par invite() — sinon fait un signUp admin).
 *       3. Fixe le mot de passe choisi par l'invité.
 *       4. Crée le profil `public.users` (role=Boutique, hérite nom commercial
 *          + logo + adresse + heures depuis le proprio).
 *       5. Active le membership et y attache user_id.
 *       6. Retourne une session pour connecter l'invité immédiatement.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, owner_name, password]
 *             properties:
 *               token: { type: string }
 *               owner_name: { type: string, minLength: 2 }
 *               password: { type: string, minLength: 6 }
 *               phone: { type: string }
 *     responses:
 *       200: { description: "Profil créé, session retournée" }
 *       400: { description: "Token invalide / expiré / révoqué" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Méthode non autorisée" });
    }

    try {
        const { token, owner_name, password, phone } = joinSchema.parse(req.body);
        const supabaseAdmin = getSupabaseAdmin();

        // 1️⃣ Cherche l'invitation
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from("boutique_membres")
            .select("id, boutique_id, email, statut, expires_at, auth_user_id")
            .eq("invite_token", token)
            .maybeSingle();

        if (inviteError || !invitation) {
            return res.status(400).json({ error: "Invitation introuvable" });
        }
        if (invitation.statut !== "pending") {
            return res.status(400).json({
                error: invitation.statut === "active"
                    ? "Cette invitation a déjà été acceptée"
                    : "Cette invitation a été révoquée",
            });
        }
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ error: "Cette invitation a expiré" });
        }

        // 2️⃣ Récupère le profil de la boutique (pour hériter nom commercial)
        const { data: boutique, error: boutiqueError } = await supabaseAdmin
            .from("users")
            .select("name, url_logo, address, heure_ouverture, heure_fermeture, description")
            .eq("id", invitation.boutique_id)
            .single();

        if (boutiqueError || !boutique) {
            return res.status(500).json({ error: "Boutique introuvable" });
        }

        // 3️⃣ Récupère ou crée le compte auth.users
        let authUserId: string;
        if (invitation.auth_user_id) {
            // inviteUserByEmail a déjà créé le user — on lui fixe le password
            authUserId = invitation.auth_user_id;
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                authUserId,
                { password, email_confirm: true },
            );
            if (updateError) {
                console.error("[join] updatePassword error:", updateError);
                return res.status(500).json({ error: "Impossible de définir le mot de passe" });
            }
        } else {
            // Cas dégradé : l'envoi d'email a échoué et auth_user_id n'a pas
            // été stocké. On crée le user directement (signup admin, email confirmé).
            const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: invitation.email,
                password,
                email_confirm: true,
            });
            if (createError || !created.user) {
                console.error("[join] createUser error:", createError);
                return res.status(500).json({
                    error: "Impossible de créer le compte (l'email est peut-être déjà utilisé)",
                });
            }
            authUserId = created.user.id;
        }

        // 4️⃣ Crée le profil public.users (upsert sur auth_id pour idempotence en cas de rejeu)
        const newProfileId = uuidv4();
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("users")
            .upsert(
                {
                    id: newProfileId,
                    auth_id: authUserId,
                    email: invitation.email,
                    name: boutique.name,
                    owner_name: owner_name,
                    role: "Boutique",
                    phone: phone ?? null,
                    url_logo: boutique.url_logo ?? null,
                    address: boutique.address ?? null,
                    heure_ouverture: boutique.heure_ouverture ?? null,
                    heure_fermeture: boutique.heure_fermeture ?? null,
                    description: boutique.description ?? null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "auth_id" },
            )
            .select()
            .single();

        if (profileError || !profile) {
            console.error("[join] profile error:", profileError);
            return res.status(500).json({ error: "Impossible de créer le profil" });
        }

        // 5️⃣ Active le membership
        const { data: activated, error: activateError } = await supabaseAdmin
            .from("boutique_membres")
            .update({
                user_id: profile.id,
                auth_user_id: authUserId,
                statut: "active",
                joined_at: new Date().toISOString(),
                invite_token: null, // invalide le token après usage
            })
            .eq("id", invitation.id)
            .select()
            .single();

        if (activateError) {
            console.error("[join] activate error:", activateError);
            return res.status(500).json({ error: "Impossible d'activer le membership" });
        }

        // 6️⃣ Connecte l'invité : signInWithPassword côté serveur retourne une session
        //     que le client utilisera comme s'il s'était connecté normalement.
        const { data: signinData, error: signinError } =
            await supabaseAdmin.auth.signInWithPassword({
                email: invitation.email,
                password,
            });

        if (signinError) {
            // Profil et membership sont OK — juste l'auto-login a échoué.
            // L'utilisateur peut se connecter manuellement avec ses identifiants.
            console.warn("[join] auto-signin failed:", signinError);
            return res.status(200).json({
                profile,
                membre: activated,
                session: null,
            });
        }

        return res.status(200).json({
            profile,
            membre: activated,
            session: signinData.session,
        });
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                errors: err.issues.map(i => ({ field: i.path[0], message: i.message })),
            });
        }
        console.error("[join] error:", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}
