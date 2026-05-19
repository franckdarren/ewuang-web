// app/lib/apiFetch.ts
/**
 * apiFetch - fetch authentifié avec retry automatique sur 401.
 *
 * - Injecte le Bearer token courant depuis le authStore.
 * - Si le serveur répond 401 (token expiré), demande un token frais
 *   (refreshAccessToken, dédupliqué) puis rejoue la requête UNE fois.
 *
 * À utiliser à la place de fetch() pour tout appel API authentifié côté
 * client. Le rafraîchissement proactif (AuthProvider) évite la plupart des
 * 401 ; ce retry couvre les cas limites (veille, requête au moment pile de
 * l'expiration).
 */

import { useAuthStore } from '@/stores/authStore';

function withAuth(init: RequestInit | undefined, token: string | null): RequestInit {
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = useAuthStore.getState().token;

    let res = await fetch(input, withAuth(init, token));
    if (res.status !== 401) return res;

    const fresh = await useAuthStore.getState().refreshAccessToken();
    if (!fresh) return res; // session morte → on renvoie le 401 d'origine

    res = await fetch(input, withAuth(init, fresh));
    return res;
}
