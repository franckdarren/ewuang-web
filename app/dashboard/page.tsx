import { createClient } from "../utils/supabase/serveur";

export default async function DashboardPage() {
    const supabase = await createClient();

    // Récupérer l'utilisateur connecté
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // Redirection si pas connecté
        return (
            <div className="p-8 text-center">
                <p>Vous n'êtes pas connecté.</p>
                <a href="/login" className="text-blue-500 underline">
                    Connectez-vous
                </a>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Bienvenue sur votre Dashboard</h1>
            <p>
                <strong>Email :</strong> {user.email}
            </p>
            <p>
                <strong>Id utilisateur :</strong> {user.id}
            </p>

            {/* Bouton logout */}

            <form method="POST" action="/api/logout">
                <button
                    type="submit"
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                    Se déconnecter
                </button>
            </form>


        </div>
    );
}
