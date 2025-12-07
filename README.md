# 📊 API Dashboard - Statistiques Admin

Route complète pour alimenter le dashboard d'administration avec toutes les métriques clés.

## 🎯 Endpoint

```
GET /api/dashboard/stats?period=month
```

## 🔐 Authentification

**Admin uniquement** - Header requis : `Authorization: Bearer YOUR_TOKEN`

## 📋 Paramètres

| Paramètre | Type | Valeurs | Défaut | Description |
|-----------|------|---------|--------|-------------|
| period | string | `today`, `week`, `month`, `year` | `month` | Période pour les stats temporelles |

## 📦 Réponse JSON

### 1. Vue d'ensemble (overview)
```json
{
  "overview": {
    "totalRevenue": 15680000,
    "periodRevenue": 3250000,
    "revenueGrowth": 23.5,
    "totalOrders": 1247,
    "periodOrders": 289,
    "ordersGrowth": 18.2,
    "averageOrderValue": 12567,
    "conversionRate": 87.3,
    "totalUsers": 3456,
    "newUsers": 145,
    "totalProducts": 892
  }
}
```

**Métriques clés :**
- 💰 Revenus totaux et de la période
- 📈 Croissance des revenus (%)
- 🛒 Nombre de commandes
- 📊 Panier moyen
- ✅ Taux de conversion (commandes livrées)
- 👥 Utilisateurs et nouveaux inscrits
- 📦 Total des produits

---

### 2. Revenus détaillés (revenue)
```json
{
  "revenue": {
    "total": 15680000,
    "period": 3250000,
    "growth": 23.5,
    "average": 12567,
    "byDay": [
      {
        "date": "2024-12-01",
        "revenue": 125000,
        "orders": 12
      }
    ]
  }
}
```

**Utilisation :** Graphiques d'évolution des revenus sur 30 jours

---

### 3. Commandes (orders)
```json
{
  "orders": {
    "total": 1247,
    "period": 289,
    "growth": 18.2,
    "byStatus": {
      "en_attente": 23,
      "en_preparation": 45,
      "prete_pour_livraison": 12,
      "en_cours_de_livraison": 8,
      "livree": 1089,
      "annule": 58,
      "rembourse": 12
    },
    "recent": [...]
  }
}
```

**Utilisation :** 
- Graphique en camembert des statuts
- Liste des 10 dernières commandes
- Indicateurs de performance

---

### 4. Utilisateurs (users)
```json
{
  "users": {
    "total": 3456,
    "customers": 3120,
    "boutiques": 336,
    "newUsers": 145
  }
}
```

**Utilisation :** Indicateurs d'acquisition et croissance

---

### 5. Produits (products)
```json
{
  "products": {
    "total": 892,
    "newProducts": 23,
    "inPromotion": 156,
    "madeInGabon": 234,
    "outOfStock": 45
  }
}
```

**Utilisation :** Gestion du catalogue et alertes stock

---

### 6. Livraisons (deliveries)
```json
{
  "deliveries": {
    "total": 1156,
    "byStatus": {
      "en_attente": 23,
      "en_cours": 8,
      "livree": 1125
    },
    "byCity": {
      "Libreville": 756,
      "Akanda": 234,
      "Owendo": 166
    },
    "pending": 31
  }
}
```

**Utilisation :** 
- Carte de répartition géographique
- Indicateurs logistiques
- Graphiques de statuts

---

### 7. Réclamations (claims)
```json
{
  "claims": {
    "total": 87,
    "new": 12,
    "byStatus": {
      "en_attente_de_traitement": 12,
      "en_cours": 23,
      "rejete": 34,
      "rembourse": 18
    },
    "rate": 6.98
  }
}
```

**Utilisation :** 
- Taux de satisfaction (100 - claimRate)
- Alertes réclamations en attente
- Suivi qualité

---

### 8. Top Performers (topPerformers)
```json
{
  "topPerformers": {
    "products": [
      {
        "article_id": "uuid",
        "name": "T-shirt Wax",
        "image": "https://...",
        "price": 15000,
        "totalQuantity": 234
      }
    ],
    "boutiques": [
      {
        "id": "uuid",
        "name": "Boutique Elegance",
        "email": "contact@elegance.ga",
        "solde": 1250000,
        "url_logo": "https://..."
      }
    ],
    "categories": [
      {
        "name": "Vêtements",
        "sales": 456
      }
    ]
  }
}
```

**Utilisation :** 
- Top 5 des produits best-sellers
- Top 5 des boutiques par revenus
- Top 5 des catégories

---

### 9. Alertes (alerts)
```json
{
  "alerts": {
    "pendingOrders": 23,
    "pendingClaims": 12,
    "pendingDeliveries": 31,
    "outOfStock": 45,
    "urgentCount": 35
  }
}
```

**Utilisation :** 
- Badges de notifications
- Alertes dashboard
- Actions urgentes

---

## 🎨 Exemples d'utilisation dans le dashboard

### 📊 Widgets principaux

```typescript
// Card Revenue
<StatCard
  title="Revenus"
  value={formatCurrency(stats.overview.totalRevenue)}
  growth={stats.overview.revenueGrowth}
  period={stats.period}
/>

// Card Commandes
<StatCard
  title="Commandes"
  value={stats.overview.totalOrders}
  growth={stats.overview.ordersGrowth}
  badge={stats.alerts.pendingOrders}
/>

// Card Utilisateurs
<StatCard
  title="Utilisateurs"
  value={stats.users.total}
  subtitle={`+${stats.users.newUsers} nouveaux`}
/>

// Card Panier Moyen
<StatCard
  title="Panier moyen"
  value={formatCurrency(stats.overview.averageOrderValue)}
/>
```

### 📈 Graphiques

```typescript
// Graphique d'évolution des revenus
<LineChart data={stats.revenue.byDay} />

// Répartition des commandes par statut
<PieChart data={stats.orders.byStatus} />

// Top produits
<BarChart data={stats.topPerformers.products} />

// Carte des livraisons par ville
<MapChart data={stats.deliveries.byCity} />
```

### 🔔 Notifications

```typescript
// Badge d'alertes
<NotificationBadge count={stats.alerts.urgentCount} />

// Liste des alertes
{stats.alerts.pendingOrders > 0 && (
  <Alert variant="warning">
    {stats.alerts.pendingOrders} commandes en attente
  </Alert>
)}

{stats.alerts.outOfStock > 0 && (
  <Alert variant="danger">
    {stats.alerts.outOfStock} produits en rupture
  </Alert>
)}
```

---

## 🚀 Exemple de requête

```bash
# Statistiques du mois
curl -X GET "https://api.votresite.com/api/dashboard/stats?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Statistiques de la semaine
curl -X GET "https://api.votresite.com/api/dashboard/stats?period=week" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Statistiques du jour
curl -X GET "https://api.votresite.com/api/dashboard/stats?period=today" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Métriques inspirées des grandes marketplaces

### Amazon / eBay
- ✅ Revenus et croissance
- ✅ Panier moyen (AOV)
- ✅ Taux de conversion
- ✅ Top produits et catégories

### Shopify
- ✅ Commandes par statut
- ✅ Évolution sur 30 jours
- ✅ Nouveaux utilisateurs
- ✅ Produits en promotion

### Jumia / Kilimall
- ✅ Livraisons par ville
- ✅ Produits "Made in Gabon"
- ✅ Réclamations et taux
- ✅ Top boutiques

---

## ⚡ Performance

- **Cache recommandé** : 5-15 minutes
- **Temps de réponse** : ~500ms-2s selon le volume
- **Optimisation** : Ajouter des index sur `created_at`

---

## 🎯 KPIs essentiels affichés

1. **Financiers**
   - Revenus totaux et période
   - Croissance des revenus
   - Panier moyen

2. **Opérationnels**
   - Commandes par statut
   - Livraisons en cours
   - Taux de conversion

3. **Qualité**
   - Taux de réclamation
   - Commandes annulées
   - Satisfaction client

4. **Croissance**
   - Nouveaux utilisateurs
   - Nouveaux produits
   - Boutiques actives

5. **Alertes**
   - Actions urgentes
   - Ruptures de stock
   - Réclamations en attente
