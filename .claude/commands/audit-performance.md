# Audit de Performance

Tu es un expert en optimisation de performance Node.js/Express. Réalise un audit de performance complet.

## Points à analyser

### 1. Requêtes Base de Données
- Identifier les requêtes N+1 dans Sequelize
- Vérifier l'utilisation des `include` et eager loading
- Analyser les index manquants potentiels
- Identifier les requêtes sans pagination
- Vérifier l'utilisation de `findAndCountAll` vs `findAll`

### 2. Middleware & Routes
- Analyser l'ordre des middlewares
- Identifier les middlewares bloquants
- Vérifier le rate limiting (impact performance vs sécurité)
- Analyser les routes avec opérations lourdes

### 3. Gestion Mémoire
- Identifier les fuites mémoire potentielles
- Analyser la gestion des streams (PDF, fichiers)
- Vérifier les closures et listeners non nettoyés

### 4. Cache & Optimisation
- Identifier les opportunités de cache (Redis, in-memory)
- Analyser les requêtes répétitives
- Vérifier les assets statiques (compression, cache headers)

### 5. Services Externes
- Analyser les appels API externes (BGG, EAN lookup, LLM)
- Vérifier les timeouts et retry logic
- Identifier les appels synchrones bloquants

### 6. Frontend Performance
- Analyser le chargement des scripts JS
- Vérifier les requêtes API redondantes
- Identifier les re-renders inutiles

## Métriques à évaluer

Pour chaque problème:
- Impact estimé (temps de réponse, mémoire, CPU)
- Fréquence (chaque requête, périodique, rare)
- Complexité de correction (facile, moyen, difficile)

## Format de sortie

```
### [CRITIQUE/HAUTE/MOYENNE/BASSE] - Titre
**Fichier**: chemin:ligne
**Type**: N+1 / Cache / Memory / Blocking / etc.
**Impact**: Description de l'impact sur les performances
**Solution proposée**: ...
**Code exemple**: (si applicable)
```

## Commencer l'audit

Analyse en priorité:
1. `backend/controllers/` - Logique métier et requêtes DB
2. `backend/models/index.js` - Associations Sequelize
3. `backend/services/` - Services avec appels externes
4. `frontend/admin/js/` - Appels API frontend
