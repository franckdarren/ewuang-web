// app/lib/stockSync.ts
//
// Synchronise le stock total d'un article avec la somme des stocks de ses variations.
// Règle : si un article a au moins une variation, son champ "stock" est dérivé et
// doit toujours valoir la somme des stocks de ses variations. Si aucune variation
// n'existe, le stock saisi manuellement par le boutiquier est conservé tel quel.

import { supabaseAdmin } from "./supabaseAdmin";

export async function recomputeArticleStock(articleId: string): Promise<number | null> {
  const { data: variations, error } = await supabaseAdmin
    .from("variations")
    .select("stock")
    .eq("article_id", articleId);

  if (error) {
    console.error("[stockSync] erreur lecture variations:", error);
    return null;
  }

  if (!variations || variations.length === 0) {
    return null;
  }

  const total = variations.reduce((sum, v) => sum + (v.stock ?? 0), 0);

  const { error: updateErr } = await supabaseAdmin
    .from("articles")
    .update({ stock: total, updated_at: new Date().toISOString() })
    .eq("id", articleId);

  if (updateErr) {
    console.error("[stockSync] erreur update stock article:", updateErr);
    return null;
  }

  return total;
}
