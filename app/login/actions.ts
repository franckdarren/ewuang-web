"use server";

import { createClient } from "../utils/supabase/serveur";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // Traduction des messages d'erreur en français
        let errorMessage = "Une erreur est survenue lors de la connexion";

        switch (error.message) {
            case "Invalid login credentials":
                errorMessage = "Email ou mot de passe incorrect";
                break;
            case "Email not confirmed":
                errorMessage = "Veuillez confirmer votre adresse email";
                break;
            case "User already registered":
                errorMessage = "Cet email est déjà utilisé";
                break;
            case "Email rate limit exceeded":
                errorMessage = "Trop de tentatives. Veuillez réessayer dans quelques minutes";
                break;
            case "Invalid email":
                errorMessage = "Adresse email invalide";
                break;
            default:
                // En développement, afficher le message original pour déboguer
                errorMessage = process.env.NODE_ENV === "development"
                    ? `Erreur: ${error.message}`
                    : "Une erreur est survenue. Veuillez réessayer";
        }

        return { error: errorMessage };
    }

    // Succès → redirection
    redirect("/dashboard");
}