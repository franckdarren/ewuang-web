'use client'

import Link from "next/link"
import {
  IconTrendingDown,
  IconTrendingUp,
  IconMinus,
  IconArrowRight,
} from "@tabler/icons-react"
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
  users?: {
    total: number
    clients: number
    boutiques: number
    newUsers: number
  }
  products?: {
    total: number
    newProducts: number
    inPromotion: number
    madeInGabon: number
    outOfStock: number
  }
  reclamations?: {
    total: number
    new: number
    byStatus: {
      en_attente_de_traitement: number
      en_cours: number
      rejete: number
      rembourse: number
    }
    rate: number
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

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR")
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

function LinkCard({
  href,
  ariaLabel,
  children,
}: {
  href: string
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="@container/card h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer">
        {children}
      </Card>
    </Link>
  )
}

export function SectionCards({ stats }: SectionCardsProps) {
  const overview = stats?.overview
  const alerts = stats?.alerts
  const products = stats?.products
  const usersStats = stats?.users
  const reclamations = stats?.reclamations

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">

      {/* Revenus → Transactions */}
      <LinkCard href="/dashboard/transactions" ariaLabel="Voir les transactions">
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
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir les transactions
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Commandes → /dashboard/commandes */}
      <LinkCard href="/dashboard/commandes" ariaLabel="Voir les commandes">
        <CardHeader>
          <CardDescription>Commandes (ce mois)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview ? formatNumber(overview.periodOrders) : "—"}
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
            Total : {overview ? formatNumber(overview.totalOrders) : "—"} commandes
          </div>
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir toutes les commandes
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Utilisateurs → /dashboard/users */}
      <LinkCard href="/dashboard/users" ariaLabel="Voir les utilisateurs">
        <CardHeader>
          <CardDescription>Utilisateurs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview ? formatNumber(overview.totalUsers) : "—"}
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
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir tous les utilisateurs
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Articles → /dashboard/articles */}
      <LinkCard href="/dashboard/articles" ariaLabel="Voir les articles">
        <CardHeader>
          <CardDescription>Articles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {overview ? formatNumber(overview.totalProducts) : "—"}
          </CardTitle>
          <CardAction>
            {products && products.newProducts > 0 ? (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <IconTrendingUp className="size-3" />
                +{products.newProducts} nouveaux
              </Badge>
            ) : (
              <Badge variant="outline">...</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {products ? formatNumber(products.madeInGabon) : "—"} Made in Gabon
          </div>
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir tous les articles
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Promotions → /dashboard/articles */}
      <LinkCard href="/dashboard/articles" ariaLabel="Voir les articles en promotion">
        <CardHeader>
          <CardDescription>Promotions</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {products ? formatNumber(products.inPromotion) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              <IconTrendingUp className="size-3" />
              En promo
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Articles avec réduction
          </div>
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Gérer les promotions
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Boutiques → /dashboard/boutiques */}
      <LinkCard href="/dashboard/boutiques" ariaLabel="Voir les boutiques">
        <CardHeader>
          <CardDescription>Boutiques</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {usersStats ? formatNumber(usersStats.boutiques) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              Vendeurs
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Boutiques enregistrées
          </div>
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir toutes les boutiques
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Retours (Réclamations) → /dashboard/reclamations */}
      <LinkCard href="/dashboard/reclamations" ariaLabel="Voir les retours / réclamations">
        <CardHeader>
          <CardDescription>Retours</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {reclamations ? formatNumber(reclamations.total) : "—"}
          </CardTitle>
          <CardAction>
            {reclamations && reclamations.new > 0 ? (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <IconTrendingUp className="size-3" />
                +{reclamations.new} récents
              </Badge>
            ) : (
              <Badge variant="outline">...</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {reclamations ? reclamations.byStatus.en_attente_de_traitement : "—"} en attente · {reclamations ? reclamations.byStatus.rembourse : "—"} remboursés
          </div>
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir les réclamations
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>

      {/* Alertes urgentes → /dashboard/commandes */}
      <LinkCard href="/dashboard/commandes" ariaLabel="Voir les commandes en attente">
        <CardHeader>
          <CardDescription>Alertes urgentes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {alerts ? formatNumber(alerts.urgentCount) : "—"}
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
            {alerts ? alerts.pendingOrders : "—"} commandes · {alerts ? alerts.outOfStock : "—"} ruptures
          </div>
          <div className="text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
            Voir les commandes en attente
            <IconArrowRight className="size-3" />
          </div>
        </CardFooter>
      </LinkCard>
    </div>
  )
}
