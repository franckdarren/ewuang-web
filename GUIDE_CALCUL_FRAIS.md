# Guide du Calcul des Frais — Commandes Ewuang

Ce document décrit comment le montant total d'une commande est calculé côté backend ([pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)) lorsqu'un client passe au paiement.

## Formule générale

```
total = Σ (prix_unitaire × quantité)        ← prix des articles
      + Σ frais_admin_par_article           ← commission plateforme
      − remise_code_promo                   ← si code promo valide
      + frais_livraison                     ← uniquement si isLivrable = true
```

Le `total` ainsi calculé est ce qui est envoyé à PVIT comme `amount` à débiter.

---

## 1. Sous-total des articles

Pour chaque ligne du panier :

```
sous_total_ligne = prix_unitaire × quantité
```

Le `prix_unitaire` vaut :
- `article.prix_promotion` si `article.is_promotion = true`
- `article.prix` sinon

Le total des sous-totaux donne la base de la commande, avant frais et remises.

---

## 2. Frais admin (commission plateforme)

Les frais admin reviennent à l'administrateur (`role = "Administrateur"`). Ils sont calculés **par article**, selon le **prix unitaire** (et non le sous-total), puis multipliés par la quantité.

### Barème

| Prix unitaire de l'article | Frais admin par unité |
|----------------------------|----------------------|
| < 15 000 FCFA              | **300 FCFA**         |
| 15 000 → 49 999 FCFA       | **500 FCFA**         |
| ≥ 50 000 FCFA              | **1 000 FCFA**       |

### Exemples

| Panier                                      | Calcul        | Frais admin |
|---------------------------------------------|---------------|-------------|
| 1 article à 600 FCFA                        | 300 × 1       | **300**     |
| 2 articles à 600 FCFA                       | 300 × 2       | **600**     |
| 1 article à 20 000 FCFA, quantité 3         | 500 × 3       | **1 500**   |
| 1 article à 8 000 + 1 article à 60 000      | 300 + 1 000   | **1 300**   |

Ces frais sont versés au solde admin **uniquement** quand le paiement passe avec succès (webhook PVIT `SUCCESS`).

---

## 3. Bénéfice boutique

Pour chaque article, la boutique (`article.user_id`) reçoit :

```
bénéfice_boutique = (prix_unitaire × quantité) − frais_admin_ligne
```

Le total des bénéfices par boutique est agrégé dans `details.boutique_benefices`, puis crédité sur le solde de chaque boutique au webhook `SUCCESS` (via la RPC `increment_user_solde`).

---

## 4. Code promo (remise)

Si un `code_promo` valide est fourni, une remise est appliquée sur le sous-total des articles (avant frais de livraison).

### Conditions de validité

- `est_actif = true`
- Pas expiré (`date_expiration > now()` ou `null`)
- N'a pas atteint sa limite d'utilisation (`utilisations_actuelles < utilisations_max`)
- Si lié à un `article_id` précis, cet article doit être présent dans le panier
- Sous-total ≥ `montant_min` du code

### Calcul de la remise

| Type      | Formule                                                  |
|-----------|----------------------------------------------------------|
| `pourcentage` | `Math.round(sous_total × (valeur / 100))`            |
| montant fixe  | `Math.min(valeur, sous_total)` *(plafonné au sous-total)* |

La remise est soustraite du `total`. Si elle excède le total, le total est forcé à 0.

---

## 5. Frais de livraison

Ajoutés **uniquement si `body.isLivrable = true`** (case "Livraison" cochée côté client).

### Tarif de base par zone

L'adresse est passée en minuscules ; le premier mot-clé qui matche détermine le tarif :

| Adresse contient | Base livraison |
|------------------|----------------|
| `libreville`     | 2 500 FCFA     |
| `akanda`         | 2 000 FCFA     |
| `owendo`         | 3 000 FCFA     |
| autre (défaut)   | 3 000 FCFA     |

### Multi-boutiques

Si la commande contient des articles de **plusieurs boutiques distinctes**, le tarif de base est multiplié par le nombre de boutiques, **plafonné à 8 000 FCFA** :

```
frais_livraison = min(base × nombre_de_boutiques, 8000)
```

### Exemples

| Adresse                 | Nb boutiques | Calcul                | Frais livraison |
|-------------------------|--------------|-----------------------|-----------------|
| Libreville, Louis       | 1            | 2 500 × 1             | **2 500**       |
| Akanda                  | 2            | 2 000 × 2             | **4 000**       |
| Libreville              | 4            | min(2 500 × 4, 8 000) | **8 000**       |
| Lambaréné (hors zone)   | 1            | 3 000 × 1             | **3 000**       |

---

## 6. Exemple complet de bout en bout

**Panier :**
- 1 sac à 12 000 FCFA (boutique A)
- 2 cartes à 800 FCFA pièce (boutique B)

**Paramètres :**
- Livraison à Libreville, `isLivrable = true`
- Code promo `BIENVENUE10` (10%, sans `montant_min`)

**Calcul :**

```
sous_total       = 12 000 + 2 × 800           = 13 600
frais_admin      = 300 + 2 × 300              = 900
total            = 13 600 + 900               = 14 500

remise_10%       = round(13 600 × 0.10)       = 1 360
total            = 14 500 − 1 360             = 13 140

frais_livraison  = min(2 500 × 2 boutiques, 8 000) = 5 000
total final      = 13 140 + 5 000             = 18 140 FCFA
```

C'est le `total` envoyé à PVIT (`amount: 18140`).

---

## 7. Tester en environnement PVIT sandbox

PVIT en mode test **ne se base pas sur le numéro de téléphone** pour simuler la réponse, mais sur le **montant** :

| Montant total      | Webhook PVIT simulé |
|--------------------|---------------------|
| < 1 000 XAF        | `SUCCESS`           |
| ≥ 1 000 XAF        | `FAILED`            |

Pour valider le chemin succès en sandbox, monter un panier dont le **total final** est strictement inférieur à 1 000 XAF. Le plus simple :

- 1 article à **600 FCFA**
- `isLivrable = false`
- Pas de code promo
- → 600 + 300 (frais admin) = **900 XAF** ✓

Pour valider le chemin échec, n'importe quel total ≥ 1 000 XAF déclenche `FAILED`.

PVIT exige au minimum **2 simulations SUCCESS et 2 simulations FAILED** avant le passage en production.

---

## 8. Où modifier les frais

| Type de frais       | Fichier                                                                                     | Lignes      |
|---------------------|---------------------------------------------------------------------------------------------|-------------|
| Barème frais admin  | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)                          | ~242-245    |
| Tarif livraison     | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)                          | ~310-318    |
| Plafond livraison   | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)                          | `Math.min(..., 8000)` |
| Logique code promo  | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts) + table `codes_promo`    | ~270-305    |

Les valeurs sont actuellement codées en dur. Pour passer à une configuration dynamique (table `parametres_frais` admin-éditable), il faudrait extraire ces constantes vers une RPC Supabase ou un endpoint `/api/parametres`.
