import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../app/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Supabase retourne 'user' et 'session' dans data
        return res.status(200).json({ user: data.user, session: data.session });
    } catch (err: any) {
        console.error("Signup error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
