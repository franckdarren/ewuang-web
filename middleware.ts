import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // 1️⃣ Créer le client Supabase Middleware (lecture session)
    const supabase = createMiddlewareSupabaseClient({ req, res });

    // 2️⃣ Récupérer la session (user + token)
    const { data: { session } } = await supabase.auth.getSession();

    const url = req.nextUrl.pathname;

    // Si pas connecté → redirection
    if (!session) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const authUserId = session.user.id;

    // 3️⃣ Récupérer le rôle dans ta table public.users
    const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", authUserId)
        .single();

    if (error || !profile) {
        return NextResponse.redirect(new URL("/erreur", req.url));
    }

    const role = profile.role;

    // 4️⃣ Définir les règles de protection par rôles
    const roleRules = [
        {
            role: "Boutique",
            prefix: "/boutique",
        },
        {
            role: "Livreur",
            prefix: "/livreur",
        },
        {
            role: "Client",
            prefix: "/client",
        },
    ];

    // 5️⃣ Vérifier chaque règle
    for (const rule of roleRules) {
        if (url.startsWith(rule.prefix) && role !== rule.role) {
            // Accès interdit → redirection
            return NextResponse.redirect(new URL("/403", req.url));
        }
    }

    // Autorisé → continuer
    return res;
}

export const config = {
    matcher: [
        "/boutique/:path*",
        "/livreur/:path*",
        "/client/:path*",
    ],
};
