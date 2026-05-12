'use client'

import { IconTrendingDown, IconTrendingUp, IconMinus } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardStats {
  overview: {
    totalRevenue: number
    periodRevenue: number
    revenueGrowth: number
    totalOrders: number
    periodOrders: number
    ordersGrowth: number
    averageOrderValue: number
    conversionRate: number
    totalUsers: number
    newUsers: number
    totalProducts: number
  }
  alerts: {
    pendingOrders: number
    pendingClaims: number
    pendingDeliveries: number
    outOfStock: number
    urgentCount: number
  }
}

interface SectionCardsProps {
  stats?: DashboardStats | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-GA", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value)
}

function GrowthBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200">
        <IconTrendingUp className="size-3" />
        +{value.toFixed(1)}%
      </Badge>
    )
  }
  if (value < 0) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-200">
        <IconTrendingDown className="size-3" />
        {value.toFixed(1)}%
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <IconMinus className="size-3" />
      0%
    </Badge>
  )
}

export function SectionCards({ stats }: SectionCardsProps) {
  const overview = stats?.overview
  const alerts = stats?.alerts

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">

      {/* Revenus */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Revenus (ce mois)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview ? formatCurrency(overview.periodRevenue) : "—"}
          </CardTitle>
          <CardAction>
            {overview ? (
              <GrowthBadge value={overview.revenueGrowth} />
            ) : (
              <Badge variant="outline">...</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total : {overview ? formatCurrency(overview.totalRevenue) : "—"}
          </div>
          <div className="text-muted-foreground">
            Panier moyen : {overview ? formatCurrency(overview.averageOrderValue) : "—"}
          </div>
        </CardFooter>
      </Card>

      {/* Commandes */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Commandes (ce mois)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview ? overview.periodOrders.toLocaleString("fr-FR") : "—"}
          </CardTitle>
          <CardAction>
            {overview ? (
              <GrowthBadge value={overview.ordersGrowth} />
            ) : (
              <Badge variant="outline">...</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total : {overview ? overview.totalOrders.toLocaleString("fr-FR") : "—"} commandes
          </div>
          <div className="text-muted-foreground">
            Taux de livraison : {overview ? `${overview.conversionRate}%` : "—"}
          </div>
        </CardFooter>
      </Card>

      {/* Utilisateurs */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Utilisateurs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview ? overview.totalUsers.toLocaleString("fr-FR") : "—"}
          </CardTitle>
          <CardAction>
            {overview && overview.newUsers > 0 ? (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <IconTrendingUp className="size-3" />
                +{overview.newUsers} nouveaux
              </Badge>
            ) : (
              <Badge variant="outline">...</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {overview ? overview.newUsers : "—"} nouveaux ce mois
          </div>
          <div className="text-muted-foreground">
            Produits actifs : {overview ? overview.totalProducts.toLocaleString("fr-FR") : "—"}
          </div>
        </CardFooter>
      </Card>

      {/* Alertes */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Alertes urgentes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {alerts ? alerts.urgentCount : "—"}
          </CardTitle>
          <CardAction>
            {alerts && alerts.urgentCount > 0 ? (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <IconTrendingUp className="size-3" />
                À traiter
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <IconTrendingUp className="size-3" />
                Tout est bon
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {alerts ? alerts.pendingOrders : "—"} commandes en attente
          </div>
          <div className="text-muted-foreground">
            {alerts ? alerts.pendingClaims : "—"} réclamations · {alerts ? alerts.outOfStock : "—"} ruptures
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
