const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erreur : Variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.");
  process.exit(1);
}

async function pingDatabase() {
  console.log('📡 Envoi du ping à Supabase...');

  const response = await fetch(`${supabaseUrl}/rest/v1/articles?select=id&limit=1`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
  });

  if (!response.ok) {
    console.error(`❌ Échec du ping : HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  console.log('✅ Ping réussi ! La base de données est détectée comme active.');
}

pingDatabase();
