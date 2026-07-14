import { supabaseAdmin } from "./supabaseAdmin";

const STATUTS_PRETS = ["Prête pour livraison", "En cours de livraison", "Livrée"];

/**
 * Enrichit une liste de livraisons avec le nombre de boutiques (sous-commandes)
 * de leur commande_groupe, et combien sont déjà prêtes/en cours/livrées.
 *
 * Une commande mono-boutique (ou une livraison sans groupe_id) renvoie 1/1 :
 * comportement neutre, pas de badge "multi-boutiques" côté UI.
 */
export async function attachGroupeInfo<T extends { groupe_id?: string | null }>(
    livraisons: T[],
): Promise<(T & { boutiques_total: number; boutiques_pretes: number })[]> {
    const groupeIds = [
        ...new Set(livraisons.map((l) => l.groupe_id).filter((id): id is string => !!id)),
    ];

    if (groupeIds.length === 0) {
        return livraisons.map((l) => ({ ...l, boutiques_total: 1, boutiques_pretes: 1 }));
    }

    const { data: livraisonsGroupes } = await supabaseAdmin
        .from("livraisons")
        .select("groupe_id, commandes (statut)")
        .in("groupe_id", groupeIds);

    const compteurs = new Map<string, { total: number; pretes: number }>();
    for (const l of livraisonsGroupes ?? []) {
        const gid = l.groupe_id as string;
        const entry = compteurs.get(gid) ?? { total: 0, pretes: 0 };
        entry.total += 1;
        const statutCommande = (l.commandes as { statut?: string } | null)?.statut;
        if (statutCommande && STATUTS_PRETS.includes(statutCommande)) entry.pretes += 1;
        compteurs.set(gid, entry);
    }

    return livraisons.map((l) => {
        const entry = l.groupe_id ? compteurs.get(l.groupe_id) : undefined;
        return {
            ...l,
            boutiques_total: entry?.total ?? 1,
            boutiques_pretes: entry?.pretes ?? 1,
        };
    });
}

/**
 * Cherche, parmi les sous-commandes sœurs d'un même commande_groupe, un
 * livreur déjà assigné à l'une d'entre elles (celui qui a réclamé la
 * première boutique prête). Retourne son id, ou null si le groupe n'a pas
 * encore été réclamé.
 */
export async function findLivreurDuGroupe(
    groupeId: string,
    excludeCommandeId: string,
): Promise<string | null> {
    const { data } = await supabaseAdmin
        .from("livraisons")
        .select("livreur_id, commande_id, updated_at")
        .eq("groupe_id", groupeId)
        .neq("commande_id", excludeCommandeId)
        .not("livreur_id", "is", null)
        .order("updated_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    return data?.livreur_id ?? null;
}
