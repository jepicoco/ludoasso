# Plan de Couverture des Tests Unitaires

> Derniere mise a jour: 2024-12-09

## Resume Executif

| Metrique | Valeur | Objectif | Progression |
|----------|--------|----------|-------------|
| Tests existants | 825 | 500+ | Atteint |
| Couverture estimee | ~60% | 60%+ | Atteint |
| Controllers testes | 9/35 | 20/35 | 26% |
| Services testes | 3/12 | 10/12 | 25% |
| Middlewares testes | 6/7 | 7/7 | 86% |

---

## Etat des Tests par Module

### Legende
- Teste (>70% couverture)
- Partiellement teste (<70%)
- Non teste
- Critique (securite/metier)
- Haute priorite
- Moyenne priorite
- Basse priorite

---

## Controllers (35 fichiers)

### Critiques (Securite/Auth)
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| authController.js | Teste | 47 | Fait |
| utilisateurController.js | Teste | 61 | Fait |

### Metier Principal
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| cotisationController.js | Teste | 54 | Fait |
| empruntController.js | Teste | 48 | Fait |
| jeuController.js | Teste | 44 | Fait |
| livreController.js | Teste | 44 | Fait |
| filmController.js | Teste | 75 | Fait |
| disqueController.js | Teste | 49 | Fait |
| statsController.js | Teste | 49 | Fait |

### Import/Export
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| importController.js | Teste | 49 | Fait |
| exportComptableController.js | Non teste | 0 | Haute |
| barcodeController.js | Non teste | 0 | Moyenne |

### Parametrage
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| parametresController.js | Non teste | 0 | Moyenne |
| parametresFrontController.js | Non teste | 0 | Moyenne |
| tarifCotisationController.js | Non teste | 0 | Moyenne |
| tarifsController.js | Non teste | 0 | Moyenne |
| codesReductionController.js | Non teste | 0 | Moyenne |
| modesPaiementController.js | Non teste | 0 | Basse |

### Communications
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| configurationsEmailController.js | Non teste | 0 | Moyenne |
| configurationsSMSController.js | Non teste | 0 | Moyenne |
| templatesMessagesController.js | Non teste | 0 | Moyenne |
| eventTriggersController.js | Non teste | 0 | Moyenne |
| emailLogController.js | Non teste | 0 | Basse |
| smsLogController.js | Non teste | 0 | Basse |

### Infrastructure
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| siteController.js | Non teste | 0 | Moyenne |
| compteBancaireController.js | Non teste | 0 | Basse |
| modulesActifsController.js | Non teste | 0 | Basse |
| ipAutoriseesController.js | Non teste | 0 | Basse |
| archivesController.js | Non teste | 0 | Basse |
| referentielsController.js | Non teste | 0 | Basse |

### IA/Enrichissement
| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| llmController.js | Non teste | 0 | Basse |
| enrichissementController.js | Non teste | 0 | Basse |
| thematiqueController.js | Non teste | 0 | Basse |
| outilsController.js | Non teste | 0 | Basse |

---

## Services (12 fichiers)

| Fichier | Status | Tests | Priorite | Notes |
|---------|--------|-------|----------|-------|
| emailService.js | Teste | 42 | Fait | Chiffrement AES-256 |
| eventTriggerService.js | Non teste | 0 | Critique | Notifications auto |
| comptabiliteService.js | Partiel | ~30 | Haute | Helpers testes |
| pdfService.js | Partiel | ~10 | Moyenne | Generation PDF |
| rechercheNaturelleService.js | Non teste | 0 | Moyenne | |
| thematiqueService.js | Non teste | 0 | Basse | |
| enrichissementService.js | Non teste | 0 | Basse | |
| llmService.js | Non teste | 0 | Basse | |
| bggService.js | Non teste | 0 | Basse | API externe |
| eanLookupService.js | Non teste | 0 | Basse | API externe |
| joursFeriesService.js | Non teste | 0 | Basse | |
| vacancesScolairesService.js | Non teste | 0 | Basse | |

---

## Middlewares (7 fichiers)

| Fichier | Status | Tests | Priorite | Notes |
|---------|--------|-------|----------|-------|
| validate.js | Teste | 59 | Fait | 18 schemas |
| auth.js | Teste | 24 | Fait | JWT verify |
| checkRole.js | Teste | 44 | Fait | RBAC complet |
| maintenance.js | Teste | 29 | Fait | IP whitelist |
| usagerAuth.js | Teste | 42 | Fait | Portal auth |
| rateLimiter.js | Teste | 33 | Fait | 4 limiters |
| requestLogger.js | Non teste | 0 | Basse | Simple logging |

---

## Utils (5 fichiers)

| Fichier | Status | Tests | Priorite |
|---------|--------|-------|----------|
| smsService.js | Non teste | 0 | Moyenne |
| barcodeGenerator.js | Non teste | 0 | Basse |
| auditLogger.js | Non teste | 0 | Basse |
| logger.js | Non teste | 0 | Basse |

---

## Plan de Developpement des Tests

### Phase 1 - Critique (Securite) - COMPLETE
- [x] authController.test.js (47 tests)
- [x] auth.test.js middleware (24 tests)
- [x] validate.test.js middleware (59 tests)
- [x] emailService.test.js (42 tests)

### Phase 2 - Haute Priorite (Metier) - COMPLETE
- [x] cotisationController.test.js (54 tests)
- [x] empruntController.test.js (48 tests)
- [x] utilisateurController.test.js (61 tests)
- [ ] eventTriggerService.test.js

### Phase 3 - Moyenne Priorite - COMPLETE
- [x] maintenance.test.js (29 tests)
- [x] rateLimiter.test.js (33 tests)
- [x] usagerAuth.test.js (42 tests)

### Phase 4 - Collections & Import - COMPLETE
- [x] jeuController.test.js (44 tests)
- [x] livreController.test.js (44 tests)
- [x] filmController.test.js (75 tests)
- [x] disqueController.test.js (49 tests)
- [x] importController.test.js (49 tests)

### Phase 5 - Infrastructure (A faire)
- [ ] exportComptableController.test.js
- [ ] eventTriggerService.test.js
- [ ] Autres controllers CRUD

---

## Commandes

```bash
# Executer tous les tests
npm test

# Executer avec couverture
npm test -- --coverage

# Executer un fichier specifique
npm test -- authController

# Executer en mode watch
npm test -- --watch
```

---

## Historique des Mises a Jour

| Date | Action | Tests ajoutes | Total |
|------|--------|---------------|-------|
| 2024-12-08 | Audit initial | - | 127 |
| 2024-12-08 | statsController.test.js | +49 | 127 |
| 2024-12-08 | checkRole.test.js | +44 | 127 |
| 2024-12-08 | Phase 1 - authController.test.js | +47 | 174 |
| 2024-12-08 | Phase 1 - auth.test.js | +24 | 198 |
| 2024-12-08 | Phase 1 - validate.test.js | +59 | 257 |
| 2024-12-08 | Phase 1 - emailService.test.js | +42 | 299 |
| 2024-12-08 | Phase 2 - cotisationController.test.js | +54 | 353 |
| 2024-12-08 | Phase 2 - empruntController.test.js | +48 | 401 |
| 2024-12-08 | Phase 2 - utilisateurController.test.js | +61 | 462 |
| 2024-12-08 | Phase 3 - maintenance.test.js | +29 | 491 |
| 2024-12-08 | Phase 3 - rateLimiter.test.js | +33 | 522 |
| 2024-12-09 | Phase 4 - jeuController.test.js | +44 | 566 |
| 2024-12-09 | Phase 4 - livreController.test.js | +44 | 610 |
| 2024-12-09 | Phase 4 - filmController.test.js | +75 | 685 |
| 2024-12-09 | Phase 4 - disqueController.test.js | +49 | 734 |
| 2024-12-09 | Phase 4 - importController.test.js | +49 | 783 |
| 2024-12-09 | Phase 4 - usagerAuth.test.js | +42 | 825 |
