'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  IconArrowLeft,
  IconBuildingStore,
  IconShoppingCart,
  IconTrendingUp,
  IconAlertCircle,
  IconPackage,
  IconCircleCheck,
  IconClock,
  IconX,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { ContactButton } from '@/components/chat/contact-button'

interface BoutiqueDetail {
  period: string
  boutique: {
    id: string
    name: string
    email: string
    url_logo: string | null
    phone: string | null
    address: string | null
    created_at: string
    is_active: boolean
    solde: number
  }
  finances: {
    chiffre_affaires: number
    chiffre_affaires_all_time: number
    panier_moyen: number
    solde_actuel: number
  }
  commandes: {
    total: number
    total_all_time: number
    taux_conversion: number
    by_status: {
      en_attente: number
      en_preparation: number
      prete_pour_livraison: number
      en_cours_de_livraison: number
      livree: number
      annulee: number
      remboursee: number
    }
  }
  articles: {
    total: number
    en_promotion: number
    top_vendus: {
      article_id: string
      nom: string
      image: string | null
      prix: number
      quantite_vendue: number
      revenu: number
    }[]
  }
  reclamations: {
    total: number
    en_attente: number
    resolues: number
    taux: number
  }
  evolution: { date: string; revenue: number; orders: number }[]
}

function formatXAF(value: number) {
  return new Intl.NumberFormat('fr-GA', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all'
const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  week: '7 derniers jours',
  month: '30 derniers jours',
  year: 'Cette année',
  all: 'Tout le temps',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  en_attente: { label: 'En attente', color: 'text-orange-600', icon: <IconClock className="size-4" /> },
  en_preparation: { label: 'En préparation', color: 'text-blue-600', icon: <IconPackage className="size-4" /> },
  prete_pour_livraison: { label: 'Prête livraison', color: 'text-indigo-600', icon: <IconPackage className="size-4" /> },
  en_cours_de_livraison: { label: 'En livraison', color: 'text-purple-600', icon: <IconShoppingCart className="size-4" /> },
  livree: { label: 'Livrée', color: 'text-green-600', icon: <IconCircleCheck className="size-4" /> },
  annulee: { label: 'Annulée', color: 'text-red-600', icon: <IconX className="size-4" /> },
  remboursee: { label: 'Remboursée', color: 'text-gray-600', icon: <IconX className="size-4" /> },
}

export default function BoutiqueDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [data, setData] = useState<BoutiqueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isInitialized, isAuthenticated])

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !token || !id) return

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/analytics/admin/boutiques/${id}?period=${period}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Erreur lors du chargement')
        }
        setData(await res.json())
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isInitialized, isAuthenticated, token, id, period])

  const boutique = data?.boutique

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={() => router.back()}
        >
          <IconArrowLeft className="size-4 mr-1" /> Retour
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {boutique?.url_logo
                ? <Image src={boutique.url_logo} alt={boutique.name ?? ''} width={56} height={56} className="object-cover" />
                : <IconBuildingStore className="size-7 text-muted-foreground" />
              }
            </div>
            <div>
              {loading
                ? <div className="h-6 w-40 animate-pulse rounded bg-muted mb-1" />
                : <h1 className="text-2xl font-bold tracking-tight">{boutique?.name}</h1>
              }
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {loading
                  ? <div className="h-4 w-56 animate-pulse rounded bg-muted" />
                  : (
                    <>
                      <span>{boutique?.email}</span>
                      {boutique?.phone && <><span>·</span><span>{boutique.phone}</span></>}
                      {boutique?.created_at && <><span>·</span><span>Depuis {formatDate(boutique.created_at)}</span></>}
                    </>
                  )
                }
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {boutique && (
              <Badge
                variant="outline"
                className={boutique.is_active ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}
              >
                {boutique.is_active ? 'Active' : 'Inactive'}
              </Badge>
            )}
            {boutique && (
              <ContactButton
                targetUserId={boutique.id}
                label="Contacter la boutique"
                variant="outline"
              />
            )}
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 lg:mx-6 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconTrendingUp className="size-4" /> Chiffre d'affaires
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? '—' : formatXAF(data!.finances.chiffre_affaires)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {loading ? '' : `All-time : ${formatXAF(data!.finances.chiffre_affaires_all_time)}`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconShoppingCart className="size-4" /> Commandes
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? '—' : data!.commandes.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {loading ? '' : `All-time : ${data!.commandes.total_all_time}`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconCircleCheck className="size-4" /> Taux conversion
            </CardDescription>
            <CardTitle className={`text-xl tabular-nums ${!loading && data!.commandes.taux_conversion >= 50 ? 'text-green-600' : 'text-orange-600'}`}>
              {loading ? '—' : `${data!.commandes.taux_conversion}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {loading ? '' : `Panier moyen : ${formatXAF(data!.finances.panier_moyen)}`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconAlertCircle className="size-4" /> Réclamations
            </CardDescription>
            <CardTitle className={`text-xl tabular-nums ${!loading && data!.reclamations.total > 0 ? 'text-destructive' : ''}`}>
              {loading ? '—' : data!.reclamations.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {loading ? '' : `Taux : ${data!.reclamations.taux}%`}
          </CardContent>
        </Card>
      </div>

      {/* Évolution revenus */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des revenus (30 derniers jours)</CardTitle>
            <CardDescription>Revenus journaliers livrés (XAF)</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-2 sm:px-6">
            {loading ? (
              <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
            ) : !data?.evolution.some((d) => d.revenue > 0) ? (
              <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                Aucune vente sur cette période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.evolution}>
                  <defs>
                    <linearGradient id="fillCA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={28}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'revenue'
                        ? [`${value.toLocaleString('fr-FR')} XAF`, 'Revenus']
                        : [value, 'Commandes']
                    }
                    labelFormatter={(v) =>
                      new Date(v).toLocaleDateString('fr-FR', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })
                    }
                  />
                  <Area
                    dataKey="revenue"
                    type="natural"
                    fill="url(#fillCA)"
                    stroke="var(--primary)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commandes par statut + Top articles */}
      <div className="grid gap-4 px-4 lg:px-6 lg:grid-cols-2">
        {/* Commandes par statut */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes par statut</CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(data!.commandes.by_status).map(([key, count]) => {
                  const cfg = STATUS_CONFIG[key]
                  const total = data!.commandes.total
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`${cfg.color} shrink-0`}>{cfg.icon}</span>
                      <span className="text-sm flex-1">{cfg.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums font-medium w-6 text-right">{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top articles */}
        <Card>
          <CardHeader>
            <CardTitle>Top articles vendus</CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : data!.articles.top_vendus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune vente sur cette période
              </p>
            ) : (
              <div className="space-y-3">
                {data!.articles.top_vendus.map((article, idx) => (
                  <div key={article.article_id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="size-8 rounded overflow-hidden bg-muted shrink-0">
                      {article.image
                        ? <Image src={article.image} alt={article.nom} width={32} height={32} className="object-cover" />
                        : <div className="size-full flex items-center justify-center">
                          <IconPackage className="size-4 text-muted-foreground" />
                        </div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{article.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {article.quantite_vendue} vendu{article.quantite_vendue > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums font-semibold shrink-0">
                      {formatXAF(article.revenu)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Résumé réclamations + solde */}
      <div className="grid gap-4 px-4 lg:px-6 lg:grid-cols-2 pb-6">
        <Card>
          <CardHeader>
            <CardTitle>Réclamations</CardTitle>
            <CardDescription>Depuis toujours</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{data!.reclamations.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-orange-600">{data!.reclamations.en_attente}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">En attente</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-green-600">{data!.reclamations.resolues}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Résolues</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finances</CardTitle>
            <CardDescription>Solde et catalogue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{formatXAF(data!.finances.solde_actuel)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Solde actuel</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{data!.articles.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Articles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-primary">{data!.articles.en_promotion}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">En promo</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
