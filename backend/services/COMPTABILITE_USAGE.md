# Guide d'utilisation du module Comptabilité - Phase 1

## Vue d'ensemble

Le module de comptabilité Phase 1 implémente :
- **Numérotation automatique** des pièces comptables (cotisations, factures, avoirs, reçus)
- **Génération d'écritures comptables** pour les cotisations
- **Export FEC** (Fichier des Écritures Comptables) conforme aux normes fiscales françaises

## Installation

### 1. Exécuter la migration

```bash
cd database/migrations
node addPhase1Comptabilite.js up
```

Cette commande crée :
- Table `compteurs_pieces` : gestion des numéros de pièces
- Table `ecritures_comptables` : stockage des écritures
- Colonnes dans `cotisations` : `numero_piece_comptable`, `date_comptabilisation`

## Utilisation du service Comptabilité

### Générer des écritures pour une cotisation

```javascript
const ComptabiliteService = require('./services/comptabiliteService');
const { Cotisation } = require('./models');

// Récupérer une cotisation
const cotisation = await Cotisation.findByPk(1);

// Générer automatiquement les écritures comptables
const ecritures = await ComptabiliteService.genererEcrituresCotisation(cotisation);

// Résultat : 2 écritures créées
// - Débit : compte d'encaissement (banque/caisse selon mode paiement)
// - Crédit : compte de produit (7061 - Cotisations)
// + Numéro de pièce généré automatiquement (ex: COT2025-00001)
```

### Options de génération

```javascript
// Personnaliser le journal et les comptes
const ecritures = await ComptabiliteService.genererEcrituresCotisation(cotisation, {
  journalCode: 'VT',           // Journal des ventes (par défaut)
  compteEncaissement: '5121',  // Compte courant (auto-détecté selon mode paiement)
  compteProduit: '7061'        // Cotisations (par défaut)
});
```

### Modes de paiement et comptes d'encaissement

| Mode paiement | Compte par défaut | Libellé |
|--------------|-------------------|---------|
| especes | 5300 | Caisse principale |
| cheque | 5121 | Compte courant |
| carte_bancaire | 5121 | Compte courant |
| virement | 5121 | Compte courant |
| prelevement | 5121 | Compte courant |

### Vérifier si une cotisation a des écritures

```javascript
const aEcritures = await ComptabiliteService.cotisationAEcritures(cotisationId);
if (aEcritures) {
  console.log('Cette cotisation a déjà été comptabilisée');
}
```

### Récupérer les écritures d'une cotisation

```javascript
const ecritures = await ComptabiliteService.getEcrituresCotisation(cotisationId);
console.log(`${ecritures.length} écritures trouvées`);
```

### Générer des écritures pour plusieurs cotisations

```javascript
const resultats = await ComptabiliteService.genererEcrituresMultiples([1, 2, 3, 4]);

console.log(`Succès: ${resultats.succes.length}`);
console.log(`Erreurs: ${resultats.erreurs.length}`);

// Détails des succès
resultats.succes.forEach(s => {
  console.log(`Cotisation ${s.cotisationId}: ${s.numeroPiece} (${s.nbEcritures} écritures)`);
});

// Détails des erreurs
resultats.erreurs.forEach(e => {
  console.log(`Cotisation ${e.cotisationId}: ${e.erreur}`);
});
```

### Supprimer les écritures d'une cotisation

```javascript
// Utile en cas d'annulation
const nbSupprimees = await ComptabiliteService.supprimerEcrituresCotisation(cotisationId);
console.log(`${nbSupprimees} écritures supprimées`);
// Note: impossible de supprimer des écritures lettrées
```

## Génération de numéros de pièces

### Utilisation du modèle CompteurPiece

```javascript
const { CompteurPiece, sequelize } = require('./models');

// Générer un numéro avec transaction (recommandé)
const transaction = await sequelize.transaction();
try {
  const numeroPiece = await CompteurPiece.genererNumero('COT', 2025, transaction);
  console.log(numeroPiece); // COT2025-00001

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}

// Format des numéros
// COT2025-00001 : Cotisation
// FAC2025-00001 : Facture
// AVO2025-00001 : Avoir
// REC2025-00001 : Reçu
```

### Obtenir le dernier numéro généré

```javascript
const dernierNumero = await CompteurPiece.obtenirDernierNumero('COT', 2025);
console.log(dernierNumero); // 1, 2, 3...
```

### Réinitialiser un compteur (tests uniquement)

```javascript
await CompteurPiece.reinitialiser('COT', 2025);
```

## Export FEC

### Routes disponibles

#### 1. Exporter le fichier FEC

```http
GET /api/export-comptable/fec?exercice=2025
Authorization: Bearer {token}
```

Télécharge un fichier au format : `{SIREN}FEC{timestamp}.txt`

Format conforme à l'arrêté du 29 juillet 2013 (18 colonnes séparées par |)

#### 2. Liste des exercices disponibles

```http
GET /api/export-comptable/exercices
Authorization: Bearer {token}
```

Réponse :
```json
{
  "exercices": [
    {
      "exercice": 2025,
      "nb_ecritures": 156,
      "date_premiere_ecriture": "2025-01-01",
      "date_derniere_ecriture": "2025-12-06"
    }
  ]
}
```

#### 3. Statistiques d'un exercice

```http
GET /api/export-comptable/statistiques/2025
Authorization: Bearer {token}
```

Réponse :
```json
{
  "exercice": 2025,
  "statistiques": {
    "nb_ecritures_total": 156,
    "total_debit": 15000.00,
    "total_credit": 15000.00,
    "equilibre": true,
    "difference": 0.00
  },
  "par_journal": [
    {
      "journal_code": "VT",
      "nb_ecritures": 150,
      "total_debit": 7500.00,
      "total_credit": 7500.00
    }
  ]
}
```

### Permissions requises

Toutes les routes nécessitent :
- Authentification (token JWT)
- Rôle `admin` ou `comptable`

## Plan comptable

### Comptes de trésorerie

- **512** - Banque
  - **5121** - Compte courant
  - **5122** - Livret A
- **530** - Caisse
  - **5300** - Caisse principale

### Comptes de tiers

- **411** - Clients
  - **4110** - Clients divers
- **467** - Autres comptes débiteurs ou créditeurs

### Comptes de produits

- **706** - Prestations de services
  - **7061** - Cotisations
  - **7062** - Locations
- **758** - Produits divers de gestion courante

### Comptes de TVA

- **4457** - TVA collectée
- **4456** - TVA déductible

## Format FEC

### Structure du fichier

Le fichier FEC contient 18 colonnes séparées par des pipes (|) :

1. **JournalCode** - Code du journal (VT, BQ, CA...)
2. **JournalLib** - Libellé du journal
3. **EcritureNum** - Numéro de l'écriture
4. **EcritureDate** - Date de l'écriture (YYYYMMDD)
5. **CompteNum** - Numéro du compte général
6. **CompteLib** - Libellé du compte
7. **CompAuxNum** - Numéro du compte auxiliaire
8. **CompAuxLib** - Libellé du compte auxiliaire
9. **PieceRef** - Référence de la pièce
10. **PieceDate** - Date de la pièce (YYYYMMDD)
11. **EcritureLib** - Libellé de l'écriture
12. **Debit** - Montant au débit (format: 1234,56)
13. **Credit** - Montant au crédit (format: 1234,56)
14. **EcritureLet** - Code de lettrage
15. **DateLet** - Date de lettrage
16. **ValidDate** - Date de validation (YYYYMMDD)
17. **Montantdevise** - Montant en devise
18. **Idevise** - Identifiant de la devise

### Exemple de ligne FEC

```
VT|Journal des ventes|VT2025-COT2025-00001|20250115|5121|Compte courant|CLI000001||COT2025-00001|20250115|Cotisation Jean Dupont - 2025-01-01 à 2025-12-31|25,00|0,00|||20250115||
```

## Workflow comptable recommandé

### Pour chaque cotisation

1. **Création de la cotisation** dans l'interface
2. **Génération automatique** des écritures comptables
   - Lors de la création de la cotisation
   - Ou via un traitement batch mensuel
3. **Vérification** périodique de l'équilibre
4. **Export FEC** en fin d'exercice pour le comptable

### Exemple d'intégration dans le controller cotisations

```javascript
// Dans cotisationsController.js - méthode create
const { Cotisation } = require('../models');
const ComptabiliteService = require('../services/comptabiliteService');

// Après création de la cotisation
const cotisation = await Cotisation.create(cotisationData);

// Générer automatiquement les écritures comptables
try {
  await ComptabiliteService.genererEcrituresCotisation(cotisation);
  console.log(`Écritures générées pour cotisation ${cotisation.id}`);
} catch (error) {
  console.error('Erreur génération écritures:', error);
  // Ne pas bloquer la création de cotisation si échec comptable
}
```

## Prochaines phases

### Phase 2 - Comptabilité analytique et TVA
- Gestion des sections analytiques
- Calcul automatique de la TVA
- Rapprochements bancaires (lettrage)

### Phase 3 - Automatisation et intégration
- Export vers logiciels comptables (Ciel, EBP, Sage)
- Tableau de bord comptable
- Alertes et notifications

## Dépannage

### La migration échoue

Vérifiez que :
- MySQL est démarré
- Les variables d'environnement sont correctes dans `.env`
- L'utilisateur MySQL a les droits CREATE TABLE

### Les numéros de pièces ne se génèrent pas

Vérifiez que :
- La table `compteurs_pieces` existe
- L'utilisateur utilise une transaction lors de l'appel à `genererNumero`
- L'exercice est valide (entre 2000 et 2100)

### L'export FEC est vide

Vérifiez que :
- Des écritures existent pour l'exercice demandé
- Les écritures ont bien un exercice défini
- La requête SQL fonctionne directement dans MySQL

## Support

Pour toute question sur le module comptabilité :
- Consulter la documentation du code (commentaires JSDoc)
- Vérifier les logs dans `logs/combined.log`
- Tester avec les données de seed
