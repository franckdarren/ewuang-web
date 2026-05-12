'use client';

import { useEffect, useState } from 'react';
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { RecentOrdersTable } from "@/components/recent-orders-table";
import { useAuthStore, useIsAdmin, useUserName } from '@/stores/authStore';

interface DashboardData {
  period: string
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
  revenue: {
    byDay: { date: string; revenue: number; orders: number }[]
  }
  orders: {
    recent: {
      id: string
      numero: string
      prix: number
      statut: string
      created_at: string
      users: { name: string; email: string } | null
    }[]
  }
  alerts: {
    pendingOrders: number
    pendingClaims: number
    pendingDeliveries: number
    outOfStock: number
    urgentCount: number
  }
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAdmin = useIsAdmin();
  const userName = useUserName();
  const token = useAuthStore((state) => state.token);

  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isInitialized, isAuthenticated]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !token) return;

    async function fetchStats() {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics/admin/stats?period=month', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Erreur lors du chargement des statistiques');
        }
        const data: DashboardData = await res.json();
        setStats(data);
      } catch (e: any) {
        setError(e.message ?? 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [isInitialized, isAuthenticated, token]);

  if (!isInitialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {userName} !
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Tableau de bord administrateur"
            : `Rôle : ${user.role}`
          }
        </p>
      </div>

      {error && (
        <div className="mx-4 lg:mx-6 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <SectionCards stats={stats} />
      )}

      <div className="px-4 lg:px-6">
        {loading ? (
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        ) : (
          <ChartAreaInteractive data={stats?.revenue.byDay} />
        )}
      </div>

      {loading ? (
        <div className="mx-4 lg:mx-6 h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <RecentOrdersTable orders={stats?.orders.recent} />
      )}
    </div>
  );
}
