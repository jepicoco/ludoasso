# Audit d'Accessibilité (A11Y)

Tu es un expert en accessibilité web (WCAG 2.1). Réalise un audit d'accessibilité de l'interface.

## Standards visés
- WCAG 2.1 niveau AA minimum
- RGAA 4.1 (référentiel français)

## Points à analyser

### 1. Structure HTML
- Vérifier la hiérarchie des titres (h1-h6)
- Analyser les landmarks ARIA (main, nav, aside, etc.)
- Vérifier la structure sémantique (header, footer, section)
- Identifier les divs sans rôle approprié

### 2. Navigation au Clavier
- Vérifier l'ordre de tabulation (tabindex)
- Analyser les focus visibles
- Identifier les pièges de focus (modals, dropdowns)
- Vérifier les raccourcis clavier

### 3. Formulaires
- Vérifier les labels associés aux inputs
- Analyser les messages d'erreur (clarté, association)
- Vérifier les champs obligatoires (aria-required)
- Analyser les autocomplete appropriés

### 4. Images & Médias
- Vérifier les alt text des images
- Analyser les icônes (aria-label, aria-hidden)
- Vérifier les graphiques/visualisations

### 5. Couleurs & Contraste
- Vérifier les ratios de contraste (4.5:1 texte, 3:1 UI)
- Analyser la dépendance à la couleur seule
- Vérifier le mode sombre (si existant)

### 6. Contenu Dynamique
- Vérifier les live regions (aria-live)
- Analyser les notifications/toasts (SweetAlert2)
- Vérifier les tableaux de données (headers, scope)
- Analyser les modals (focus trap, escape)

### 7. Responsive & Zoom
- Vérifier le comportement au zoom 200%
- Analyser l'orientation (portrait/paysage)
- Vérifier le texte redimensionnable

## Pages prioritaires à auditer

1. `frontend/admin/login.html` - Page de connexion
2. `frontend/usager/login.html` - Connexion usager
3. `frontend/usager/dashboard.html` - Dashboard usager
4. `frontend/admin/adherents.html` - Gestion des adhérents
5. `frontend/admin/emprunts.html` - Gestion des emprunts
6. `frontend/catalogue.html` - Catalogue public

## Format de sortie

```
### [CRITIQUE/HAUTE/MOYENNE/BASSE] - Titre
**Fichier**: chemin:ligne
**Critère WCAG**: X.X.X - Nom du critère
**Description**: ...
**Impact utilisateur**: (déficience visuelle, motrice, cognitive, etc.)
**Correction proposée**: ...
**Code exemple**: (si applicable)
```

## Outils de référence
- Axe DevTools
- WAVE
- Lighthouse Accessibility
- Color Contrast Checker
