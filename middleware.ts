import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "./app/lib/supabaseAdmin";

const PUBLIC = ["/login", "/auth/callback", "/403", "/erreur"];

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const pathname = req.nextUrl.pathname;

    if (PUBLIC.some((p) => pathname.startsWith(p))) return res;

    // Vérification explicite des variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Variables d'environnement Supabase manquantes dans le middleware");
        return NextResponse.redirect(new URL("/erreur", req.url));
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll: () => req.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        res.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    console.log("🔍 USER:", user?.id, user?.email);

    if (!user) {
        console.log("❌ Pas d'utilisateur, redirection vers /login");
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const { data: profile, error } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

    console.log("🔍 PROFILE:", profile);
    console.log("🔍 ERROR:", error);

    if (error || !profile) {
        console.log("❌ Erreur profil, redirection vers /erreur");
        return NextResponse.redirect(new URL("/erreur", req.url));
    }

    const role = profile.role;
    console.log("✅ Role:", profile.role);

    const rules = [
        { role: "Boutique", prefix: "/boutique" },
        { role: "Livreur", prefix: "/livreur" },
        { role: "Client", prefix: "/client" },
        { role: "Administrateur", prefix: "/dashboard" },
    ];

    for (const rule of rules) {
        if (pathname.startsWith(rule.prefix) && role !== rule.role) {
            return NextResponse.redirect(new URL("/403", req.url));
        }
    }

    return res;
}

export const config = {
    matcher: [
        "/boutique/:path*",
        "/livreur/:path*",
        "/client/:path*",
        "/dashboard/:path*",
    ],
};