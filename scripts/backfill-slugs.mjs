// Génère un slug public pour les boutiques existantes qui n'en ont pas encore.
// Usage : node scripts/backfill-slugs.mjs

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erreur : Variables d'environnement SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) ou SUPABASE_SERVICE_ROLE_KEY manquantes.");
  process.exit(1);
}

const headers = {
  apikey: supabaseServiceKey,
  Authorization: `Bearer ${supabaseServiceKey}`,
  "Content-Type": "application/json",
};

const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

function generateSlugLocal(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchJson(path) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
  if (!response.ok) {
    throw new Error(`Échec GET ${path} : HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function patchJson(path, body) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Échec PATCH ${path} : HTTP ${response.status} ${response.statusText}`);
  }
}

async function backfillSlugs() {
  console.log("📡 Récupération des boutiques sans slug...");

  // Les gérants (boutique_membres.role_membre = 'gerant', statut = 'active') ont eux aussi
  // une ligne users avec role = 'Boutique' mais représentent un membre du staff, pas une
  // boutique distincte (même exclusion que pages/api/boutiques/list.ts) : on ne leur génère
  // pas de slug/page publique.
  const gerantRows = await fetchJson(
    "boutique_membres?select=user_id&role_membre=eq.gerant&statut=eq.active"
  );
  const gerantIds = new Set(gerantRows.map((r) => r.user_id).filter(Boolean));

  const existingSlugRows = await fetchJson("users?select=slug&slug=not.is.null");
  const takenSlugs = new Set(existingSlugRows.map((r) => r.slug));

  const boutiques = await fetchJson(
    "users?select=id,name,owner_name&role=eq.Boutique&slug=is.null"
  );
  const toProcess = boutiques.filter((b) => !gerantIds.has(b.id));

  console.log(`🔎 ${toProcess.length} boutique(s) à traiter (sur ${boutiques.length} sans slug).`);

  for (const boutique of toProcess) {
    const base = generateSlugLocal(boutique.name || boutique.owner_name || "boutique") || "boutique";
    let candidate = base;
    let suffix = 2;
    while (takenSlugs.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    takenSlugs.add(candidate);

    await patchJson(`users?id=eq.${boutique.id}`, { slug: candidate });
    console.log(`✅ ${boutique.name || boutique.id} → ${candidate}`);
  }

  console.log("🏁 Backfill terminé.");
}

backfillSlugs().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
