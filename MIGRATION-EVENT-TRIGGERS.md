# Migration : Système de Communication avec Event Triggers

Ce document explique comment mettre en place le système complet de communication avec les déclencheurs d'événements (event triggers).

## 📋 Vue d'ensemble

Le système permet d'envoyer automatiquement des emails lors d'événements spécifiques :
- Création d'un adhérent → Email de bienvenue
- Création d'un emprunt → Email de confirmation
- Création d'une cotisation → Email de confirmation
- Rappels automatiques pour les emprunts (J-3, Jour J, Retards)

## 🚀 Installation en Production

### Option 1 : Via NPM Scripts (Recommandé)

Depuis le dossier `ludotheque/`, exécutez :

```bash
# Installation complète (migrations + seeds)
npm run setup-complete-communications
```

Cette commande va :
1. ✅ Créer la table `templates_messages`
2. ✅ Créer la table `event_triggers`
3. ✅ Insérer les 7 templates de messages
4. ✅ Insérer les 11 event triggers
5. ✅ Lier automatiquement les templates aux événements

### Option 2 : Étape par étape

```bash
# 1. Créer la table templates_messages
npm run migrate-templates

# 2. Créer la table event_triggers
npm run migrate-event-triggers

# 3. Insérer les templates alignés avec les event triggers
npm run seed-templates-event-triggers

# 4. Insérer les event triggers
npm run seed-event-triggers
```

### Option 3 : Via SQL Direct (Si npm ne fonctionne pas)

Exécutez le fichier SQL dans phpMyAdmin ou MySQL Workbench :
```
database/migrations/complete-communications-migration.sql
```

## 📦 Fichiers créés/modifiés

### Backend

#### Services
- ✅ `backend/services/eventTriggerService.js` - Service principal de gestion des événements
- ✅ `backend/services/emailService.js` - Service d'envoi d'emails (déjà existant)

#### Controllers (Modifiés)
- ✅ `backend/controllers/adherentController.js` - Ajout des hooks ADHERENT_CREATED, ADHERENT_UPDATED, ADHERENT_SUSPENDED
- ✅ `backend/controllers/empruntController.js` - Ajout des hooks EMPRUNT_CREATED, EMPRUNT_RETURNED
- ✅ `backend/controllers/cotisationController.js` - Ajout du hook COTISATION_CREATED

#### Routes & Controllers (Nouveaux)
- ✅ `backend/routes/eventTriggers.js` - API REST pour gérer les event triggers
- ✅ `backend/controllers/eventTriggersController.js` - Logique métier des event triggers

#### Models (Nouveaux)
- ✅ `backend/models/EventTrigger.js` - Modèle Sequelize pour les event triggers
- ✅ `backend/models/TemplateMessage.js` - Modèle Sequelize pour les templates (déjà existant)

### Frontend

#### Pages Admin
- ✅ `frontend/admin/event-triggers.html` - Interface de gestion des event triggers
- ✅ `frontend/admin/js/event-triggers.js` - Logique JavaScript de la page

#### Navigation
- ✅ `frontend/admin/js/admin-navigation.js` - Ajout de l'entrée "Déclencheurs" dans le menu

### Database

#### Migrations
- ✅ `database/migrations/addTemplatesMessages.js` - Création de la table templates_messages
- ✅ `database/migrations/addEventTriggers.js` - Création de la table event_triggers
- ✅ `database/migrations/complete-communications-migration.sql` - Migration SQL complète

#### Seeds
- ✅ `database/seeds/seedTemplatesForEventTriggers.js` - Templates alignés avec les event triggers
- ✅ `database/seeds/seedEventTriggers.js` - Event triggers par défaut

### Configuration
- ✅ `package.json` - Ajout des nouveaux scripts npm

## 🎯 Event Triggers disponibles

### Adhérents
| Code | Libellé | Template | Actif par défaut |
|------|---------|----------|------------------|
| `ADHERENT_CREATED` | Création de compte adhérent | `ADHERENT_CREATION` | ✅ Oui |
| `ADHERENT_UPDATED` | Modification de compte | Aucun | ❌ Non |
| `ADHERENT_SUSPENDED` | Suspension de compte | Aucun | ❌ Non |

### Emprunts
| Code | Libellé | Template | Actif par défaut |
|------|---------|----------|------------------|
| `EMPRUNT_CREATED` | Création d'emprunt | `EMPRUNT_CONFIRMATION` | ✅ Oui |
| `EMPRUNT_RETURNED` | Retour d'emprunt | Aucun | ❌ Non |
| `EMPRUNT_RAPPEL_J3` | Rappel J-3 avant échéance | `EMPRUNT_RAPPEL_AVANT` | ✅ Oui |
| `EMPRUNT_RAPPEL_ECHEANCE` | Rappel jour J | `EMPRUNT_RAPPEL_ECHEANCE` | ✅ Oui |
| `EMPRUNT_RETARD` | Relance pour retard | `EMPRUNT_RELANCE_RETARD` | ✅ Oui |

### Cotisations
| Code | Libellé | Template | Actif par défaut |
|------|---------|----------|------------------|
| `COTISATION_CREATED` | Création de cotisation | `COTISATION_CONFIRMATION` | ✅ Oui |
| `COTISATION_EXPIRATION` | Rappel expiration | `COTISATION_RAPPEL` | ✅ Oui |
| `COTISATION_EXPIRED` | Cotisation expirée | Aucun | ❌ Non |

## 🔧 Configuration

### 1. Accéder à l'interface de gestion

URL : `http://localhost:3000/admin/event-triggers.html`

### 2. Configurer un déclencheur

1. Cliquez sur le bouton "Modifier" (crayon) d'un événement
2. Sélectionnez le template email souhaité
3. Activez/désactivez l'envoi email avec le switch
4. Configurez le délai d'envoi (0 = immédiat)
5. Enregistrez

### 3. Activer/Désactiver rapidement

Utilisez les boutons toggle (enveloppe et SMS) directement dans la liste pour activer/désactiver rapidement l'envoi.

## 🧪 Tests

### Tester l'envoi d'emails

1. **Configurer le serveur SMTP** (si pas déjà fait) :
   - Créer une entrée dans la table `configurations_email`
   - Ou utiliser les paramètres `.env`

2. **Créer un adhérent** :
   ```bash
   POST /api/adherents
   {
     "nom": "Test",
     "prenom": "User",
     "email": "test@example.com",
     "password": "password123"
   }
   ```
   → Si `ADHERENT_CREATED` est actif, un email sera envoyé

3. **Créer un emprunt** :
   ```bash
   POST /api/emprunts
   {
     "adherent_id": 1,
     "jeu_id": 1
   }
   ```
   → Si `EMPRUNT_CREATED` est actif, un email sera envoyé

## 📊 API REST

### Endpoints disponibles

```bash
# Lister tous les event triggers
GET /api/event-triggers

# Obtenir un event trigger par ID
GET /api/event-triggers/:id

# Obtenir un event trigger par code
GET /api/event-triggers/code/:code

# Mettre à jour un event trigger
PUT /api/event-triggers/:id

# Activer/désactiver l'email
POST /api/event-triggers/:id/toggle-email

# Activer/désactiver le SMS
POST /api/event-triggers/:id/toggle-sms

# Obtenir les templates disponibles
GET /api/event-triggers/templates?type=email

# Obtenir les statistiques
GET /api/event-triggers/stats
```

## 🔍 Dépannage

### Les emails ne partent pas

1. Vérifier la configuration SMTP dans la table `configurations_email`
2. Vérifier que l'event trigger est actif (`email_actif = 1`)
3. Vérifier que le template est associé (`template_email_code` non null)
4. Vérifier les logs dans la table `email_logs`

### Erreur de connexion à la base de données

1. Vérifier le fichier `.env`
2. Vérifier que MySQL est démarré
3. Vérifier les permissions de l'utilisateur MySQL

### L'interface admin ne s'affiche pas

1. Vérifier que le serveur est démarré : `npm run dev`
2. Vérifier l'URL : `http://localhost:3000/admin/event-triggers.html`
3. Vérifier la console du navigateur pour les erreurs JavaScript

## 📝 Variables disponibles dans les templates

### Adhérents
- `{{prenom}}` - Prénom de l'adhérent
- `{{nom}}` - Nom de l'adhérent
- `{{email}}` - Email de l'adhérent
- `{{code_barre}}` - Code-barres de l'adhérent
- `{{date_adhesion}}` - Date d'adhésion

### Emprunts
- `{{titre_jeu}}` - Titre du jeu emprunté
- `{{date_emprunt}}` - Date de l'emprunt
- `{{date_retour_prevue}}` - Date de retour prévue
- `{{jours_restants}}` - Jours restants avant échéance
- `{{jours_retard}}` - Jours de retard

### Cotisations
- `{{montant}}` - Montant de la cotisation
- `{{mode_paiement}}` - Mode de paiement
- `{{date_paiement}}` - Date de paiement
- `{{periode_debut}}` - Début de période
- `{{periode_fin}}` - Fin de période

## 🚀 Démarrage de l'application

```bash
cd W:\ludo\ludotheque
npm run dev
```

L'application sera accessible à l'adresse : `http://localhost:3000`

## ✅ Checklist de déploiement

- [ ] Migration de la base de données exécutée
- [ ] Seeds insérés (templates + event triggers)
- [ ] Configuration SMTP configurée
- [ ] Tests des envois d'emails réalisés
- [ ] Interface admin accessible
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Serveur démarré en mode production (`npm start`)

## 📚 Documentation supplémentaire

- [CLAUDE.md](CLAUDE.md) - Documentation générale du projet
- [BARCODE_SETUP.md](BARCODE_SETUP.md) - Configuration des codes-barres
- API REST : Voir `backend/routes/` pour tous les endpoints disponibles
