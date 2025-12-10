# Audit Qualité de Code

Tu es un expert en qualité de code et bonnes pratiques. Réalise un audit de la qualité du code.

## Points à analyser

### 1. Architecture & Structure
- Vérifier la séparation des responsabilités (MVC)
- Analyser la cohérence entre controllers/services/models
- Identifier le code dupliqué
- Vérifier la modularité et réutilisabilité

### 2. Conventions & Cohérence
- Nommage des variables, fonctions, fichiers
- Style de code cohérent (camelCase, snake_case)
- Organisation des imports
- Structure des fichiers similaires

### 3. Gestion des Erreurs
- Vérifier les try/catch appropriés
- Analyser la propagation des erreurs
- Vérifier les messages d'erreur (informatifs mais sécurisés)
- Identifier les erreurs silencieuses

### 4. Asynchrone & Promesses
- Vérifier l'utilisation de async/await vs callbacks
- Identifier les promesses non gérées
- Analyser les race conditions potentielles
- Vérifier les timeouts sur les opérations async

### 5. Documentation & Lisibilité
- Vérifier les commentaires sur le code complexe
- Analyser la lisibilité des fonctions longues
- Identifier les "magic numbers" et constantes non nommées

### 6. Dette Technique
- Identifier les TODO/FIXME/HACK
- Analyser le code legacy ou deprecated
- Vérifier les dépendances obsolètes

## Métriques

- Complexité cyclomatique des fonctions
- Taille des fichiers/fonctions
- Couverture de tests existante
- Nombre de dépendances

## Format de sortie

```
### [CRITIQUE/HAUTE/MOYENNE/BASSE] - Titre
**Fichier**: chemin:ligne
**Catégorie**: Architecture / Convention / Erreur / Async / Doc / Dette
**Description**: ...
**Recommandation**: ...
**Exemple de refactoring**: (si applicable)
```

## Fichiers prioritaires

1. `backend/controllers/` - Logique métier principale
2. `backend/services/` - Services partagés
3. `backend/models/index.js` - Associations (fichier volumineux)
4. `frontend/admin/js/` - Code frontend
