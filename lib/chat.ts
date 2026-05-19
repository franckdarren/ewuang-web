/**
 * lib/chat.ts
 *
 * Logique métier du système de chat sécurisé :
 *  - matrice d'autorisation (qui peut discuter avec qui)
 *  - normalisation des participants (déduplication des fils)
 *  - utilitaires de rôle / routage des notifications
 */

export type AppRole = "Administrateur" | "Boutique" | "Client" | "Livreur";

export type ChatThreadType =
    | "client_boutique"
    | "boutique_admin"
    | "client_admin"
    | "livreur_boutique"
    | "livreur_admin";

/**
 * Matrice d'autorisation : à partir des rôles des deux utilisateurs,
 * renvoie le type de fil autorisé, ou `null` si la combinaison est interdite.
 *
 * Autorisé :
 *   Client      ↔ Boutique        -> client_boutique
 *   Boutique    ↔ Administrateur  -> boutique_admin
 *   Client      ↔ Administrateur  -> client_admin
 *   Livreur     ↔ Boutique        -> livreur_boutique
 *   Livreur     ↔ Administrateur  -> livreur_admin
 *
 * Tout le reste (Client↔Client, Boutique↔Boutique, Client↔Livreur,
 * Admin↔Admin, etc.) est refusé.
 */
export function resolveThreadType(
    roleA: string,
    roleB: string
): ChatThreadType | null {
    const pair = [roleA, roleB].sort().join("|");

    switch (pair) {
        case ["Boutique", "Client"].sort().join("|"):
            return "client_boutique";
        case ["Administrateur", "Boutique"].sort().join("|"):
            return "boutique_admin";
        case ["Administrateur", "Client"].sort().join("|"):
            return "client_admin";
        case ["Boutique", "Livreur"].sort().join("|"):
            return "livreur_boutique";
        case ["Administrateur", "Livreur"].sort().join("|"):
            return "livreur_admin";
        default:
            return null;
    }
}

/**
 * Ordonne les deux identifiants de façon déterministe (ordre lexicographique)
 * afin que (X,Y) et (Y,X) produisent le même couple — indispensable pour la
 * déduplication via l'index unique en base.
 *
 * @returns [participant_a_id, participant_b_id]
 */
export function orderParticipants(
    id1: string,
    id2: string
): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Indique si `userId` est le participant "a" ou "b" du fil.
 * Sert à savoir quel compteur de non-lus consulter / réinitialiser.
 */
export function participantSlot(
    thread: { participant_a_id: string; participant_b_id: string },
    userId: string
): "a" | "b" | null {
    if (thread.participant_a_id === userId) return "a";
    if (thread.participant_b_id === userId) return "b";
    return null;
}

/**
 * Préfixe de route protégée selon le rôle (cf. middleware.ts).
 * Utilisé pour générer le lien des notifications.
 */
export function rolePrefix(role: string): string {
    switch (role) {
        case "Administrateur":
            return "/dashboard";
        case "Boutique":
            return "/boutique";
        case "Livreur":
            return "/livreur";
        case "Client":
        default:
            return "/client";
    }
}
