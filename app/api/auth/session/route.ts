// app/api/auth/session/route.ts
/**
 * GET /api/auth/session
 *
 * Renvoie un access_token Supabase FRAIS.
 *
 * Le client SSR (@supabase/ssr) lit le refresh token depuis le cookie
 * httpOnly et rafraîchit automatiquement la session si l'access token est
 * expiré, puis réécrit les cookies. On expose uniquement l'access_token au
 * client pour qu'il mette à jour le store Zustand.
 *
 * Utilisé par le rafraîchissement proactif (AuthProvider) et par le retry
 * automatique sur 401 (apiFetch).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/serveur";

export async function GET() {
    const supabase = await createClient();

    // getUser() force la validation/rafraîchissement de la session côté SSR
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    return NextResponse.json({
        access_token: session.access_token,
        expires_in: session.expires_in,
    });
}
