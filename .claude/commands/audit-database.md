# Audit Base de Données

Tu es un expert en bases de données MySQL et Sequelize ORM. Réalise un audit complet du schéma et des requêtes.

## Points à analyser

### 1. Schéma & Modélisation
- Vérifier la normalisation (3NF)
- Analyser les relations et foreign keys
- Identifier les colonnes redondantes
- Vérifier les types de données appropriés

### 2. Index & Performance
- Identifier les index manquants sur les colonnes de recherche/filtrage
- Analyser les index composites nécessaires
- Vérifier les index sur les foreign keys
- Identifier les index inutilisés potentiels

### 3. Associations Sequelize
- Vérifier la cohérence des associations dans `models/index.js`
- Analyser les cascades (onDelete, onUpdate)
- Identifier les associations mal définies
- Vérifier les alias et nommage

### 4. Migrations
- Vérifier l'ordre et la cohérence des migrations
- Identifier les migrations destructives sans rollback
- Analyser la gestion des données existantes

### 5. Intégrité des Données
- Vérifier les contraintes NOT NULL appropriées
- Analyser les valeurs par défaut
- Identifier les ENUM vs tables de référence
- Vérifier les contraintes UNIQUE

### 6. Requêtes & Optimisation
- Identifier les requêtes N+1 dans les controllers
- Analyser l'utilisation de raw queries vs ORM
- Vérifier les transactions sur les opérations multiples
- Identifier les full table scans potentiels

## Tables prioritaires

1. **utilisateurs** - Table principale utilisateurs
2. **emprunts** - Jointures multiples (utilisateur, jeu, livre, film, disque)
3. **jeux/livres/films/disques** - Tables de collection avec normalization
4. **ecritures_comptables** - Données financières critiques

## Format de sortie

```
### [CRITIQUE/HAUTE/MOYENNE/BASSE] - Titre
**Table/Modèle**: nom
**Type**: Index / FK / Normalisation / Performance / Intégrité
**Description**: ...
**Impact**: (performance, intégrité, maintenance)
**SQL de correction**: (si applicable)
**Migration Sequelize**: (si applicable)
```

## Fichiers à analyser

1. `backend/models/` - Tous les modèles Sequelize
2. `backend/models/index.js` - Associations
3. `database/migrations/` - Historique des migrations
4. `backend/controllers/` - Requêtes DB dans le code
