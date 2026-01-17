# Contexte et Règles Métier : Tarification Module BAR-TH-171 (Mode CEE Uniquement)

Ce document décrit les règles métier, l'architecture hybride et les algorithmes de calcul pour la fonctionnalité "Devis sans MaPrimeRénov" du module BAR-TH-171.

## 1. Philosophie : Tarification Hybride

Le système doit utiliser une approche **"Priorité Grille > Repli sur Marge"**.

Pour chaque demande de devis, le système suit cet arbre de décision :
1.  **Vérification Legacy (Grilles)** : Est-ce que le dossier correspond à une règle "Marketing" hardcodée (Marque spécifique + Surface spécifique + Profil revenu) ?
    * *OUI* et si `enable_legacy_grid_rules` est actif dans les réglages du module : Appliquer le **Prix Forfaitaire** défini dans la grille.
    * *NON* : Passer à l'étape 2.
2.  **Calcul Dynamique (Cost-Plus)** : Calculer le prix basé sur le coût de revient réel (Stock + Main d'œuvre) + Marge minimale configurée.

---

## 2. Stratégie 1 : Règles Legacy (Grilles Fixes)

Ces règles sont historiques et doivent être migrées depuis l'ancien script python. Elles définissent un **Reste à Charge (RAC) de base** fixe.

### A. Règle d'Arrondi Spécifique
Avant toute chose, l'ancien système utilise une fonction d'arrondi psychologique très spécifique qui doit être disponible comme utilitaire (activable via settings).

**Algorithme `round_down_to_nearest_490_990` :**
* Si Montant < 500 € : Retourne 1.0 €
* Sinon, on regarde la partie centaine/dizaine/unité (le reste de la division par 1000) :
    * Si reste >= 990 : Arrondir au millier + 990 (Ex: 2995 -> 2990)
    * Si reste >= 490 : Arrondir au millier + 490 (Ex: 2560 -> 2490)
    * Si reste < 490 : Retourner au palier 990 du millier inférieur (Ex: 2430 -> 1990).
    * *Exception :* Si le montant total est < 1000 et reste < 490 (ex: 980), retourner 490.

### B. Grille : Thermor (ETAS 111-140%)
**Condition d'application :**
* Type bien : Maison
* Marque : Thermor
* ETAS (efficacité énergétique) : entre 111% et 140% (exclu 140)

**Tableau des Reste à Charge (RAC) de base :**

| Usage | Profil Revenu | Surface 70-90m² | Surface 90-110m² | Surface 110-130m² | Surface ≥ 130m² |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chauffage + ECS** (ou Combo) | Non-Bleu | 5990 € | 3990 € | 1990 € | 990 € |
| **Chauffage + ECS** (ou Combo) | Bleu | 3990 € | 1990 € | 990 € | 1 € |
| **Chauffage Seul** | Non-Bleu | 5990 € | 4990 € | 3990 € | 2990 € |

*(Note : Pour les surfaces < 70m², pas de règle définie -> Fallback stratégie dynamique).*

### C. Grille : Clivet / Hitachi
**Condition d'application :**
* Type bien : Maison
* Marque : Clivet OU Hitachi

**Sous-cas 1 : ETAS 111-140%**
| Profil | Surface 70-90 | Surface 90-110 | Surface 110-130 | Surface ≥ 130 |
| :--- | :--- | :--- | :--- | :--- |
| **Non-Bleu** | 3990 € | 2490 € (Hitachi: 2990€) | 2490 € | 1 € |
| **Bleu** | 2490 € | - | - | 1 € (si ≥ 110m²) |

**Sous-cas 2 : ETAS 140-170%**
| Profil | Surface 70-90 | Surface 90-110 | Surface 110-130 | Surface ≥ 130 |
| :--- | :--- | :--- | :--- | :--- |
| **Non-Bleu** | 3990 € | 1990 € | 1490 € | 1 € |
| **Bleu** | 1990 € | 1 € (si ≥ 90m²) | 1 € | 1 € |

---

## 3. Stratégie 2 : Calcul Dynamique (Cost-Plus)

Si aucune règle ci-dessus ne s'applique, ou si le module est configuré en mode "Strict Marge".

### Les Données Nécessaires
1.  **Prix Achat Matériel (`buying_price_ht`)** : Issu de la table `Product`.
2.  **Coût Main d'Œuvre (`labor_cost_ht`)** :
    * Soit stocké sur le produit principal (PAC).
    * Soit issu de produits de type "LABOR" sélectionnés par défaut dans les réglages du module.
3.  **Coût Forfaitaire Module** : Lignes additionnelles configurées dans le module (ex: Désembouage : 400€).
4.  **Marge Minimale (`min_margin_amount`)** : Configurée dans `ModuleSettings` (ex: 3000 €).

### L'Algorithme
1.  **Coût de Revient Total (HT)** = $\sum (Prix Achat Matériel) + \sum (Coût Main d'Œuvre) + \sum (Coûts Annexes)$.
2.  **Prix Plancher (TTC)** = (Coût de Revient Total + Marge Minimale) * (1 + TVA).
3.  **Aide CEE** = Calculée via le moteur CEE existant.
4.  **RAC Minimum Calculé** = Prix Plancher TTC - Aide CEE.

### Interaction Commerciale
Le commercial saisit un "RAC Souhaité" (Target RAC).
* Si `Target RAC` < `RAC Minimum Calculé` -> **Bloquant** (ou demande validation admin), on force le `RAC Minimum`.
* Si `Target RAC` >= `RAC Minimum Calculé` -> C'est valide. La marge augmente.

**Reconstitution du Devis (Reverse Engineering) :**
Une fois le RAC validé, on doit générer les lignes de devis pour que :
`Total TTC Devis` = `Aide CEE` + `RAC Validé`.

*Note : La différence entre le "Prix Plancher" et le "Prix Final" est injectée soit dans une ligne "Marge commerciale", soit lissée sur le prix de la PAC.*

---

## 4. Modèle de Données (Spécifications Techniques)

### Table `module_settings` (Nouveau)
Configuration spécifique au module BAR-TH-171 pour un tenant.
* `module_id`: FK
* `tenant_id`: FK
* `enable_legacy_grid_rules`: Boolean (Active/Désactive la section 2 ci-dessus).
* `rounding_mode`: Enum ('NONE', 'LEGACY_490_990').
* `min_margin_amount`: Float (ex: 3000.0).
* `max_rac_addon`: Float (ex: 2000.0 - Limite sup que le commercial peut ajouter au curseur).
* `default_labor_product_ids`: Array[Int] (Produits de main d'œuvre auto-ajoutés).
* `fixed_line_items`: JSON (Lignes fixes du devis, ex: "Mise en service": 250€).

### Table `product` (Mise à jour)
* Ajout colonne `product_type`: Enum ('MATERIAL', 'LABOR', 'SERVICE').
* Ajout colonne `buying_price_ht`: Float.

---

## 5. Exemples de Test (Pour validation)

**Cas A : Priorité Grille (Legacy)**
* *Input :* Thermor, Maison 100m², Revenu "Bleu", Zone H1.
* *Config :* `enable_legacy_grid_rules` = True.
* *Attendu :* Le système détecte la règle "Thermor / Bleu / 90-110m²".
* *Résultat :* **RAC = 1990 €**. Le prix TTC du devis sera ajusté pour que (TTC - CEE) = 1990 €.

**Cas B : Fallback Dynamique**
* *Input :* Daikin (Pas de règle legacy), Coût Matériel 5000€, Main d'œuvre 1500€.
* *Config :* Marge Min = 3000€. TVA 5.5%. CEE Calculée = 2500€.
* *Calcul Coût :* 5000 + 1500 = 6500€.
* *Calcul Plancher TTC :* (6500 + 3000) * 1.055 = 10 022.50 €.
* *RAC Minimum :* 10 022.50 - 2500 = **7 522.50 €**.
* *Scenario User :* Le commercial veut un RAC de 8000 €. C'est > 7522.50, donc OK.
* *Résultat Devis :* Prix TTC = 2500 (CEE) + 8000 (RAC) = **10 500 €**.