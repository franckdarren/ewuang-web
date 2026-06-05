'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconBuildingStore,
  IconShoppingCart,
  IconTrendingUp,
  IconAlertCircle,
  IconSearch,
  IconChevronUp,
  IconChevronDown,
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
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'

interface BoutiqueStats {
  id: string
  name: string
  email: string
  url_logo: string | null
  phone: string | null
  created_at: string
  is_active: boolean
  solde: number
  commandes: {
    total: number
    livrees: number
    en_attente: number
    en_preparation: number
    annulees: number
    remboursees: number
  }
  finances: {
    chiffre_affaires: number
    chiffre_affaires_en_cours: number
    panier_moyen: number
  }
  articles_count: number
  reclamations: {
    total: number
    en_attente: number
    resolues: number
  }
  taux_conversion: number
}

interface ApiResponse {
  period: string
  total_boutiques: number
  boutiques: BoutiqueStats[]
}

function formatXAF(value: number) {
  return new Intl.NumberFormat('fr-GA', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value)
}

type SortKey = 'chiffre_affaires' | 'commandes' | 'articles' | 'reclamations'
type Period = 'today' | 'week' | 'month' | 'year' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  week: '7 derniers jours',
  month: '30 derniers jours',
  year: 'Cette année',
  all: 'Tout le temps',
}

export default function BoutiquesStatsPage() {
  const token = useAuthStore((s) => s.token)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [sort, setSort] = useState<SortKey>('chiffre_affaires')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 15

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      window.location.href = '/login'
    }
  }, [isInitialized, isAuthenticated])

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !token) return

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/analytics/admin/boutiques?period=${period}&sort=${sort}&limit=100`,
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
  }, [isInitialized, isAuthenticated, token, period, sort])

  const filtered = data?.boutiques.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const totalCA = filtered.reduce((sum, b) => sum + b.finances.chiffre_affaires, 0)
  const totalCommandes = filtered.reduce((sum, b) => sum + b.commandes.total, 0)
  const totalArticles = filtered.reduce((sum, b) => sum + b.articles_count, 0)
  const totalRec = filtered.reduce((sum, b) => sum + b.reclamations.total, 0)

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiques par boutique</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total_boutiques} boutique${data.total_boutiques > 1 ? 's' : ''} · ${PERIOD_LABELS[period]}` : 'Chargement…'}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chiffre_affaires">Trier : CA</SelectItem>
              <SelectItem value="commandes">Trier : Commandes</SelectItem>
              <SelectItem value="articles">Trier : Articles</SelectItem>
              <SelectItem value="reclamations">Trier : Réclamations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="mx-4 lg:mx-6 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI globaux */}
      <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @xl/main:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconTrendingUp className="size-4" /> CA total
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? '—' : formatXAF(totalCA)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconShoppingCart className="size-4" /> Commandes
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? '—' : totalCommandes.toLocaleString('fr-FR')}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconBuildingStore className="size-4" /> Articles
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? '—' : totalArticles.toLocaleString('fr-FR')}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <IconAlertCircle className="size-4" /> Réclamations
            </CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {loading ? '—' : totalRec.toLocaleString('fr-FR')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recherche + tableau */}
      <div className="px-4 lg:px-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une boutique…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Boutique</th>
                  <th className="px-4 py-3 text-right font-medium">CA</th>
                  <th className="px-4 py-3 text-right font-medium">Commandes</th>
                  <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Livrées</th>
                  <th className="px-4 py-3 text-right font-medium hidden md:table-cell">Conversion</th>
                  <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">Articles</th>
                  <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">Réclamations</th>
                  <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">Panier moy.</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                          Aucune boutique trouvée
                        </td>
                      </tr>
                    )
                    : paginated.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                              {b.url_logo
                                ? <Image src={b.url_logo} alt={b.name} width={36} height={36} className="object-cover" />
                                : <IconBuildingStore className="size-5 text-muted-foreground" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[160px]">{b.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{b.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatXAF(b.finances.chiffre_affaires)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {b.commandes.total}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
                          {b.commandes.livrees}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <span className={b.taux_conversion >= 50 ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                            {b.taux_conversion}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums hidden lg:table-cell">
                          {b.articles_count}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          {b.reclamations.total > 0
                            ? <span className="text-destructive font-medium">{b.reclamations.total}</span>
                            : <span className="text-muted-foreground">0</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums hidden lg:table-cell">
                          {formatXAF(b.finances.panier_moyen)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={b.is_active
                              ? 'text-green-600 border-green-200'
                              : 'text-red-600 border-red-200'
                            }
                          >
                            {b.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/boutiques/${b.id}`}>Détails</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="text-muted-foreground text-sm sm:flex-1">
            {filtered.length} boutique{filtered.length !== 1 ? 's' : ''} — page {safePage} sur {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
