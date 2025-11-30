export default function ErreurPage() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-red-600">Erreur</h1>
                <p className="mt-4 text-gray-600">
                    Une erreur est survenue lors de la récupération de votre profil.
                </p>
                < a
                    href="/login"
                    className="mt-6 inline-block rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                >
                    Retour à la connexion
                </a>
            </div>
        </div >
    );
}