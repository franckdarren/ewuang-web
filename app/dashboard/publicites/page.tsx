// app/dashboard/publicites/page.tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp } from "lucide-react"

export default function PublicitePage() {
    return (
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* En-tête de page */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Publicités</h1>
                    <p className="text-muted-foreground">
                        Gérez vos campagnes publicitaires
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle campagne
                </Button>
            </div>

            {/* Contenu */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Promotion Été 2024</CardTitle>
                            <Badge>Active</Badge>
                        </div>
                        <CardDescription>Campagne lancée il y a 5 jours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <p className="text-lg font-semibold">1,234 vues</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Budget: 500 € / 1000 €
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Black Friday</CardTitle>
                            <Badge variant="secondary">Programmée</Badge>
                        </div>
                        <CardDescription>Début le 29 novembre</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-semibold">Budget: 2000 €</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Durée: 7 jours
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}