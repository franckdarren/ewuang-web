// pages/api/commandes/boutique/creer-pour-client.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../../../app/lib/supabaseAdmin";
import { requireBoutiqueAccess } from "../../../../app/lib/middlewares/requireBoutiqueAccess";

/**
 * @swagger
 * /api/commandes/boutique/creer-pour-client:
 *   post:
 *     summary: La boutique compose une commande pour un client (à valider ensuite par le client)
 *     description: >
 *       Endpoint réservé au propriétaire et aux gérants de boutique. Compose une
 *       commande au nom d'un client identifié par email + téléphone. Si le client
 *       n'existe pas, un compte minimal est créé et un magic link Supabase lui est
 *       envoyé. La commande est créée en statut "En attente de validation client",
 *       le stock est réservé, et la commande expire automatiquement dans 48h si
 *       le client ne la valide ni ne la refuse.
 *     tags:
 *       - Commandes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_email
 *               - client_telephone
 *               - articles
 *             properties:
 *               client_email:
 *                 type: string
 *                 format: email
 *               client_telephone:
 *                 type: string
 *               client_nom:
 *                 type: string
 *                 description: Nom du client (utilisé uniquement si le compte est créé)
 *               adresse_livraison_proposee:
 *                 type: string
 *               isLivrable:
 *                 type: boolean
 *               commentaire:
 *                 type: string
 *               articles:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [article_id, quantite]
 *                   properties:
 *                     article_id:
 *                       type: string
 *                       format: uuid
 *                     variation_id:
 *                       type: string
 *                       format: uuid
 *                     quantite:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Commande créée en attente de validation client
 *       400:
 *         description: Données invalides ou stock insuffisant
 *       403:
 *         description: Accès interdit
 */

const creerPourClientSchema = z.object({
  client_email: z.string().email(),
  client_telephone: z.string().min(5),
  client_nom: z.string().optional(),
  adresse_livraison_proposee: z.string().max(255).default(""),
  isLivrable: z.boolean().default(true),
  commentaire: z.string().max(255).optional().default(""),
  articles: z
    .array(
      z.object({
        article_id: z.string().uuid(),
        variation_id: z.string().uuid().optional(),
        quantite: z.number().int().min(1),
      })
    )
    .min(1),
});

const EXPIRATION_HEURES = 48;

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePart = `${yearShort}${month}${day}`;

  const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

  const { count, error } = await supabaseAdmin
    .from("commandes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) return `E-${datePart}-${Date.now().toString().slice(-3)}`;

  const next = (count || 0) + 1;
  return `E-${datePart}-${String(next).padStart(3, "0")}`;
}

/**
 * Cherche un client par email OU téléphone. Si rien, crée un compte Client
 * minimal via Supabase Auth (magic link) et insère la ligne users associée.
 * Retourne { client, created } où created indique si on vient de créer le compte.
 */
async function findOrCreateClient(
  email: string,
  telephone: string,
  nom: string | undefined
): Promise<{ client: { id: string; email: string; phone: string | null; name: string }; created: boolean }> {
  // 1. Recherche par email
  const { data: byEmail } = await supabaseAdmin
    .from("users")
    .select("id, email, phone, name, role")
    .eq("email", email)
    .maybeSingle();

  if (byEmail) {
    if (byEmail.role !== "Client") {
      throw new Error(`Ce compte existe déjà avec le rôle ${byEmail.role}. Impossible de lui créer une commande.`);
    }
    return { client: byEmail, created: false };
  }

  // 2. Recherche par téléphone (cas où l'email saisi diffère mais le client existe)
  const { data: byPhone } = await supabaseAdmin
    .from("users")
    .select("id, email, phone, name, role")
    .eq("phone", telephone)
    .maybeSingle();

  if (byPhone) {
    if (byPhone.role !== "Client") {
      throw new Error(`Ce numéro est déjà associé à un compte ${byPhone.role}.`);
    }
    return { client: byPhone, created: false };
  }

  // 3. Création du compte auth + envoi du magic link
  const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { name: nom ?? email.split("@")[0], role: "Client", phone: telephone },
  });

  if (inviteError || !invite?.user) {
    throw new Error(`Impossible de créer le compte client : ${inviteError?.message ?? "erreur inconnue"}`);
  }

  const newId = uuidv4();
  const { data: created, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({
      id: newId,
      auth_id: invite.user.id,
      email,
      phone: telephone,
      name: nom ?? email.split("@")[0],
      role: "Client",
      solde: 0,
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, email, phone, name")
    .single();

  if (insertError || !created) {
    throw new Error(`Impossible d'enregistrer le profil client : ${insertError?.message}`);
  }

  return { client: created, created: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const access = await requireBoutiqueAccess(req, res);
    if (!access) return;

    const body = creerPourClientSchema.parse(req.body);

    // 1. Vérifier que tous les articles appartiennent à la boutique de l'appelant
    const articleIds = body.articles.map((a) => a.article_id);
    const { data: dbArticles, error: articlesError } = await supabaseAdmin
      .from("articles")
      .select("id, prix, prix_promotion, is_promotion, stock, user_id, variations(id, stock)")
      .in("id", articleIds);

    if (articlesError || !dbArticles || dbArticles.length !== articleIds.length) {
      return res.status(400).json({ error: "Un ou plusieurs articles sont introuvables" });
    }

    const articlesEtranger = dbArticles.filter((a) => a.user_id !== access.boutiqueId);
    if (articlesEtranger.length > 0) {
      return res.status(403).json({
        error: "Vous ne pouvez créer une commande que pour vos propres articles",
        articles_etrangers: articlesEtranger.map((a) => a.id),
      });
    }

    // 2. Trouver / créer le client
    let clientInfo;
    try {
      clientInfo = await findOrCreateClient(body.client_email, body.client_telephone, body.client_nom);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
    const { client, created: clientCreated } = clientInfo;

    // 3. Calculer prix et préparer la liste des articles
    type CA = {
      article_id: string;
      variation_id: string | null;
      quantite: number;
      prix_unitaire: number;
      variation_to_update: { id: string; quantite: number } | null;
      article_to_update: { id: string; quantite: number } | null;
    };
    const commandeArticles: CA[] = [];
    let total = 0;

    for (const item of body.articles) {
      const article = dbArticles.find((a) => a.id === item.article_id)!;
      const prixUnitaire = article.is_promotion ? (article.prix_promotion ?? article.prix) : article.prix;

      let variation: { id: string; stock: number } | null = null;

      if (item.variation_id) {
        variation = (article.variations ?? []).find((v: any) => v.id === item.variation_id) ?? null;
        if (!variation) {
          return res.status(400).json({ error: `Variation ${item.variation_id} introuvable` });
        }
        if (variation.stock < item.quantite) {
          return res.status(400).json({ error: `Stock insuffisant pour la variation ${variation.id}` });
        }
      } else if (article.stock < item.quantite) {
        return res.status(400).json({ error: `Stock insuffisant pour l'article ${article.id}` });
      }

      total += prixUnitaire * item.quantite;

      commandeArticles.push({
        article_id: item.article_id,
        variation_id: item.variation_id ?? null,
        quantite: item.quantite,
        prix_unitaire: prixUnitaire,
        variation_to_update: variation ? { id: variation.id, quantite: item.quantite } : null,
        article_to_update: !variation ? { id: item.article_id, quantite: item.quantite } : null,
      });
    }

    // 4. Créer la commande en statut "En attente de validation client"
    const numero = await generateOrderNumber();
    const expireAt = new Date(Date.now() + EXPIRATION_HEURES * 3600 * 1000);

    const { data: commande, error: commandeError } = await supabaseAdmin
      .from("commandes")
      .insert({
        numero,
        user_id: client.id,
        statut: "En attente de validation client",
        prix: total,
        commentaire: body.commentaire,
        isLivrable: body.isLivrable,
        adresse_livraison: body.adresse_livraison_proposee,
        telephone_livraison: client.phone ?? body.client_telephone,
        creee_par_boutique_id: access.boutiqueId,
        adresse_a_confirmer: true,
        expire_at: expireAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commandeError || !commande) {
      console.error("[creer-pour-client] commande insert:", commandeError);
      return res.status(500).json({ error: "Impossible de créer la commande" });
    }

    // 5. Insérer les articles
    const { error: insertArticlesError } = await supabaseAdmin.from("commande_articles").insert(
      commandeArticles.map((ca) => ({
        commande_id: commande.id,
        article_id: ca.article_id,
        variation_id: ca.variation_id,
        quantite: ca.quantite,
        prix_unitaire: ca.prix_unitaire,
      }))
    );

    if (insertArticlesError) {
      await supabaseAdmin.from("commandes").delete().eq("id", commande.id);
      return res.status(500).json({ error: "Impossible d'enregistrer les articles" });
    }

    // 6. Réserver le stock (décrément atomique)
    for (const ca of commandeArticles) {
      const rpc = ca.variation_to_update
        ? await supabaseAdmin.rpc("decrement_variation_stock", {
            variation_id: ca.variation_to_update.id,
            quantity: ca.variation_to_update.quantite,
          })
        : await supabaseAdmin.rpc("decrement_article_stock", {
            article_id: ca.article_to_update!.id,
            quantity: ca.article_to_update!.quantite,
          });

      if (rpc.error) {
        // Rollback : libérer ce qu'on a déjà décrémenté + supprimer la commande
        await supabaseAdmin.rpc("liberer_stock_commande", { p_commande_id: commande.id });
        await supabaseAdmin.from("commande_articles").delete().eq("commande_id", commande.id);
        await supabaseAdmin.from("commandes").delete().eq("id", commande.id);
        return res.status(400).json({ error: `Erreur réservation stock : ${rpc.error.message}` });
      }
    }

    // 7. Notification + chat thread (pour la confirmation d'adresse)
    await supabaseAdmin.from("notifications").insert({
      user_id: client.id,
      type: "commande",
      titre: "Nouvelle commande à valider",
      message: `Une boutique a préparé une commande pour vous (${numero}). Vérifiez les articles et l'adresse, puis validez pour payer. Expire dans 48h.`,
      lien: `/commandes/${commande.id}/valider`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Création d'un thread chat lié à la commande pour confirmer l'adresse
    const [pa, pb] = [client.id, access.boutiqueId].sort();
    await supabaseAdmin
      .from("chat_threads")
      .insert({
        type: "client_boutique",
        participant_a_id: pa,
        participant_b_id: pb,
        commande_id: commande.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return res.status(201).json({
      message: clientCreated
        ? "Commande créée et compte client provisionné (magic link envoyé)"
        : "Commande créée — en attente de validation par le client",
      commande,
      client: { id: client.id, email: client.email, name: client.name, phone: client.phone, created: clientCreated },
      expire_at: expireAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }
    console.error("Error /api/commandes/boutique/creer-pour-client:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}
