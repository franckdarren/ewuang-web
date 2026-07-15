# Guide du Calcul des Frais — Commandes Ewuang

Ce document décrit comment le montant total d'une commande est calculé côté backend ([pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)) lorsqu'un client passe au paiement.

## Formule générale

```
total = Σ (prix_unitaire × quantité)        ← prix des articles (payé par le client)
      − remise_code_promo                   ← si code promo valide
      + frais_livraison                     ← uniquement si isLivrable = true
```

Le `total` ainsi calculé est ce qui est envoyé à PVIT comme `amount` à débiter.

> ⚠️ **La commission plateforme n'est PAS ajoutée au total client.** Elle est
> **supportée par la boutique** : elle est retranchée du bénéfice reversé à la
> boutique (voir §2 et §3), et versée à l'administrateur. Le client paie uniquement
> le prix des articles (moins la remise, plus la livraison).

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

Les frais admin reviennent à l'administrateur (`role = "Administrateur"`). Ils sont calculés **par ligne d'article** comme **4 % du sous-total de la ligne** (`prix_unitaire × quantité`), arrondi à l'entier le plus proche (`Math.round`).

### Taux

```
frais_admin_ligne = round(prix_unitaire × quantité × 0.04)
```

Le taux est défini par la constante `TAUX_COMMISSION` dans [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts).

### Exemples

| Panier                                      | Calcul                          | Frais admin |
|---------------------------------------------|---------------------------------|-------------|
| 1 article à 600 FCFA                        | round(600 × 0.04)               | **24**      |
| 2 articles à 600 FCFA                       | round(1 200 × 0.04)             | **48**      |
| 1 article à 20 000 FCFA, quantité 3         | round(60 000 × 0.04)            | **2 400**   |
| 1 article à 8 000 + 1 article à 60 000      | round(320) + round(2 400)       | **2 720**   |

Ces frais sont **supportés par la boutique** (retranchés de son bénéfice, voir §3) et versés au solde admin **uniquement** quand le paiement passe avec succès (webhook PVIT `SUCCESS`).

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

Le tarif de base **n'est pas codé en dur** : il est lu dans la table `zones_livraison` (colonne `tarif`) via `resolveFraisLivraison`. La résolution se fait dans cet ordre :

1. Si `zone_livraison_id` est fourni (zone choisie dans la dropdown) → on prend son `tarif`.
2. Sinon, on cherche une zone active dont le nom (`ville`) est contenu dans l'adresse.
3. Sinon, on prend la zone marquée `is_default`.
4. Filet de sécurité si la table est vide : 3 000 FCFA.

Les tarifs sont donc administrables depuis le dashboard `zones-livraison`. À titre indicatif (valeurs de seed) : Libreville 2 500, Akanda 2 000, Owendo 3 000, défaut 3 000 FCFA.

### Multi-boutiques

Si la commande contient des articles de **plusieurs boutiques distinctes**, le livreur multiplie les déplacements dans la ville. Le tarif de zone est donc multiplié par le nombre de boutiques distinctes, **plafonné à 5 000 FCFA** (constante `PLAFOND_LIVRAISON`) :

```
frais_livraison = min(tarif_zone × nombre_de_boutiques, 5000)
```

### Exemples

| Adresse                 | Nb boutiques | Calcul                | Frais livraison |
|-------------------------|--------------|-----------------------|-----------------|
| Libreville, Louis       | 1            | 2 500 × 1             | **2 500**       |
| Akanda                  | 2            | 2 000 × 2             | **4 000**       |
| Libreville              | 4            | min(2 500 × 4, 5 000) | **5 000**       |
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

remise_10%       = round(13 600 × 0.10)       = 1 360
total            = 13 600 − 1 360             = 12 240

frais_livraison  = min(2 500 × 2 boutiques, 8 000) = 5 000
total final      = 12 240 + 5 000             = 17 240 FCFA
```

C'est le `total` envoyé à PVIT (`amount: 17240`) — la commission n'y figure pas.

**Répartition de la commission (supportée par les boutiques, créditée à l'admin au succès) :**

```
frais_admin boutique A = round(12 000 × 0.04)   = 480
frais_admin boutique B = round(1 600 × 0.04)    = 64
admin_frais total                                = 544

bénéfice boutique A     = 12 000 − 480          = 11 520
bénéfice boutique B     = 1 600 − 64            = 1 536
```

---

## 7. Tester en environnement PVIT sandbox

PVIT en mode test **ne se base pas sur le numéro de téléphone** pour simuler la réponse, mais sur le **montant** :

| Montant total      | Webhook PVIT simulé |
|--------------------|---------------------|
| < 1 000 XAF        | `SUCCESS`           |
| ≥ 1 000 XAF        | `FAILED`            |

Pour valider le chemin succès en sandbox, monter un panier dont le **total final** est strictement inférieur à 1 000 XAF. Rappel : la commission (4 %) n'entre pas dans le total client, elle est prélevée sur la boutique. Le plus simple :

- 1 article à **600 FCFA**
- `isLivrable = false`
- Pas de code promo
- → total client = **600 XAF** ✓ (la commission de 24 XAF est déduite du bénéfice boutique, hors total)

Pour valider le chemin échec, n'importe quel total ≥ 1 000 XAF déclenche `FAILED`.

PVIT exige au minimum **2 simulations SUCCESS et 2 simulations FAILED** avant le passage en production.

---

## 8. Où modifier les frais

| Type de frais           | Fichier                                                                                  | Repère                        |
|-------------------------|------------------------------------------------------------------------------------------|-------------------------------|
| Taux de commission (4%) | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)                        | constante `TAUX_COMMISSION`   |
| Calcul de la commission | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts)                        | `round(sousTotal × TAUX_COMMISSION)` |
| Tarif livraison         | table `zones_livraison` (colonne `tarif`) + [initiate.ts](pages/api/paiements/initiate.ts) `resolveFraisLivraison` |            |
| Logique code promo      | [pages/api/paiements/initiate.ts](pages/api/paiements/initiate.ts) + table `codes_promo`  | section « 2. Code promo »     |

Le taux de commission est codé en dur dans la constante `TAUX_COMMISSION`. Pour passer à une configuration dynamique (table `parametres_frais` admin-éditable), il faudrait extraire cette constante vers une RPC Supabase ou un endpoint `/api/parametres`.
