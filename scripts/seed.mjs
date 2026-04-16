/**
 * RUNNER DU SEEDER - EWUANG MARKETPLACE
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
 *
 * Ou avec un fichier .env.local :
 *   npx dotenv -e .env.local -- node scripts/seed.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Vérification des variables d'environnement ───────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Variables d\'environnement manquantes :');
  if (!supabaseUrl)        console.error('   - SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nUsage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Lecture du fichier SQL ────────────────────────────────────────────────
const sqlPath = join(__dirname, 'seed.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// ─── Exécution ────────────────────────────────────────────────────────────
async function runSeed() {
  console.log('\n🌱 Démarrage du seeder Ewuang...\n');

  // Exécuter tout le SQL via la fonction RPC exec_sql ou via l'API REST
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

  if (error) {
    // Fallback : exécuter le SQL directement via l'endpoint PostgreSQL
    // Supabase expose /rest/v1/rpc/exec_sql mais nécessite une fonction créée au préalable.
    // On utilise ici l'API SQL directe (disponible avec service role key)
    console.warn('⚠️  RPC exec_sql non disponible, utilisation de l\'API SQL directe...\n');
    await runViaSqlApi(sql);
    return;
  }

  console.log('✅ Seeder exécuté avec succès via RPC.\n');
}

async function runViaSqlApi(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  // Méthode recommandée : utiliser l'API SQL de Supabase Management
  // ou passer par psql directement avec DATABASE_URL
  console.log('\n💡 CONSEIL : Pour exécuter le seeder, utilisez l\'une de ces méthodes :\n');
  console.log('   1. Via le Dashboard Supabase (recommandé) :');
  console.log('      → Aller sur https://supabase.com/dashboard');
  console.log('      → Votre projet → SQL Editor');
  console.log('      → Copier/coller le contenu de scripts/seed.sql\n');
  console.log('   2. Via psql (si DATABASE_URL disponible) :');
  console.log('      psql "$DATABASE_URL" -f scripts/seed.sql\n');
  console.log('   3. Via dotenv + psql :');
  console.log('      npx dotenv -e .env.local -- sh -c \'psql "$DATABASE_URL" -f scripts/seed.sql\'\n');

  await verifyConnection();
}

async function verifyConnection() {
  console.log('📡 Vérification de la connexion à Supabase...');
  const { data, error } = await supabase.from('users').select('id').limit(1);

  if (error) {
    console.error('❌ Connexion échouée :', error.message);
    process.exit(1);
  }

  console.log('✅ Connexion Supabase OK.\n');

  // Afficher un résumé des tables
  const tables = ['users', 'categories', 'articles', 'commandes', 'livraisons', 'publicites', 'avis', 'favoris'];
  console.log('📊 État actuel de la base de données :');
  console.log('──────────────────────────────────────');

  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`   ${table.padEnd(15)} : ${count ?? '?'} enregistrement(s)`);
  }

  console.log('──────────────────────────────────────\n');
}

runSeed().catch((err) => {
  console.error('❌ Erreur inattendue :', err.message);
  process.exit(1);
});
