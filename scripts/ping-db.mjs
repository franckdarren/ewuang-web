import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erreur : Variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function pingDatabase() {
  console.log('📡 Envoi du ping à Supabase...');

  // Utilisons une table réelle de votre base
  const { data, error } = await supabase
    .from('articles') // ⚠️ À modifier
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Échec du ping :', error.message);
    process.exit(1);
  } else {
    console.log('✅ Ping réussi ! La base de données est détectée comme active.');
  }
}

pingDatabase();