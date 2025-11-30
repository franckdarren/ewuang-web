import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Page403() {
    return (
        <div className="bg-gradient-to-br from-red-50 via-background to-orange-50 flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md">
                <Card className="border-red-200 shadow-xl">
                    <CardHeader className="text-center space-y-4 pb-4">
                        {/* Icône animée */}
                        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                            <ShieldAlert className="w-10 h-10 text-red-600" />
                        </div>

                        {/* Code d'erreur */}
                        <div>
                            <p className="text-6xl font-bold text-red-600 tracking-tight">403</p>
                            <CardTitle className="text-2xl mt-2">Accès refusé</CardTitle>
                        </div>

                        <CardDescription className="text-base">
                            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Message informatif */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                <span className="font-semibold">Pourquoi je vois cette page ?</span>
                                <br />
                                Cette zone est réservée à un rôle spécifique. Veuillez contacter
                                votre administrateur si vous pensez qu'il s'agit d'une erreur.
                            </p>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex flex-col gap-2 pt-2">
                            <Button asChild className="w-full" size="lg">
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4" />
                                    Retour à l'accueil
                                </Link>
                            </Button>

                            <Button asChild variant="outline" className="w-full" size="lg">
                                <Link href="/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Se reconnecter
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                    Besoin d'aide ?{" "}
                    <a href="#" className="text-primary hover:underline font-medium">
                        Contactez le support
                    </a>
                </p>
            </div>
        </div>
    );
}