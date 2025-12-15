# Architecture du Projet Ludothèque

## Vue d'Ensemble

Application de gestion de ludothèque (bibliothèque de jeux de société) avec backend Node.js/Express et frontend vanilla JavaScript.

**Version**: 1.0.0
**Licence**: GPL 3.0

---

## Structure des Dossiers

```
ludotheque/
├── backend/              # API Backend
│   ├── config/          # Configuration (DB, Sequelize)
│   ├── controllers/     # Logique métier
│   ├── models/          # Modèles Sequelize (ORM)
│   ├── routes/          # Définition des routes API
│   ├── middleware/      # Middlewares (auth, roles)
│   ├── services/        # Services réutilisables (email, triggers)
│   ├── utils/           # Utilitaires (barcode, SMS)
│   ├── jobs/            # Jobs planifiés (rappels email)
│   └── server.js        # Point d'entrée du serveur
├── frontend/            # Interface utilisateur
│   ├── admin/           # Interface d'administration
│   │   ├── js/         # Scripts JavaScript
│   │   ├── css/        # Styles
│   │   └── *.html      # Pages HTML
│   └── public/          # Fichiers statiques (logos, etc.)
├── database/            # Base de données
│   ├── migrations/      # Migrations JS exécutables
│   │   └── archive/    # Anciennes migrations SQL
│   ├── seeds/           # Données de seed
│   ├── diagnostics/     # Scripts de diagnostic
│   └── utils/           # Scripts utilitaires
├── tests/               # Tests unitaires et intégration
└── *.bat                # Scripts Windows helpers
```

---

## Architecture Backend

### 1. Serveur Express (backend/server.js)

- Point d'entrée principal
- Middlewares globaux: helmet (sécurité), CORS, JSON parsing
- Serve les fichiers statiques depuis `frontend/`
- Monte toutes les routes sous le préfixe `/api`

### 2. Modèles de Données (backend/models/)

**ORM**: Sequelize avec MySQL

**Modèles principaux**:
- `Adherent` - Membres de la ludothèque (+ auth usager avec reset password)
- `Jeu` - Catalogue de jeux
- `Livre` - Catalogue de livres
- `Film` - Catalogue de films
- `Disque` - Catalogue de disques
- `Emprunt` - Système de prêts (+ prolongations)
- `Prolongation` - Demandes de prolongation (auto/manuelle)
- `TarifCotisation` - Tarifs d'adhésion
- `Cotisation` - Paiements et abonnements
- `CodeReduction` - Codes promo
- `ConfigurationEmail` - Paramètres SMTP
- `ConfigurationSMS` - Paramètres SMS
- `TemplateMessage` - Templates d'emails/SMS
- `EventTrigger` - Déclencheurs automatiques
- `EmailLog` - Historique des envois
- `ParametresFront` - Paramètres frontend (dont prolongations par module)
- `IpAutorisee` - IPs autorisées en mode maintenance

**Associations**:
- `Adherent` 1-N `Emprunt`, `Cotisation`, `Prolongation`
- `Jeu`, `Livre`, `Film`, `Disque` 1-N `Emprunt`
- `Emprunt` 1-N `Prolongation`
- `TarifCotisation` 1-N `Cotisation`
- Défini dans `backend/models/index.js`

### 3. Routes API (backend/routes/)

**Architecture des Routes**:

Les routes suivent deux patterns:

**A. Routes Directes** (montées dans server.js):
```javascript
app.use('/api/auth', require('./routes/auth'));
app.use('/api/adherents', require('./routes/adherents'));
app.use('/api/jeux', require('./routes/jeux'));
app.use('/api/emprunts', require('./routes/emprunts'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/barcodes', require('./routes/barcodes'));
app.use('/api/cotisations', require('./routes/cotisations'));
app.use('/api/email-logs', require('./routes/emailLogs'));
app.use('/api/event-triggers', require('./routes/eventTriggers'));
```

**B. Routes Paramétrages** (sous-routes via `/api/parametres`):

Le fichier `backend/routes/parametres.js` regroupe toutes les routes de configuration:
- `/api/parametres/structure` - Paramètres généraux
- `/api/parametres/modes-paiement` - Modes de paiement
- `/api/parametres/codes-reduction` - Codes promo
- `/api/parametres/tarifs` - Tarifs cotisation
- `/api/parametres/configurations-email` - Config SMTP
- `/api/parametres/configurations-sms` - Config SMS
- `/api/parametres/templates-messages` - Templates

**Raison**: Regroupement logique de toutes les "configurations" sous un même endpoint pour faciliter la gestion des permissions et l'organisation.

**C. Routes Espace Usager** (authentification séparée):
```javascript
app.use('/api/usager/auth', require('./routes/usagerAuth'));
app.use('/api/usager/emprunts', require('./routes/usagerEmprunts'));
app.use('/api/prolongations', require('./routes/prolongations'));
```

**Routes Usager Auth**:
- `POST /api/usager/auth/login` - Connexion (email ou code-barre)
- `POST /api/usager/auth/forgot-password` - Demande reset password
- `POST /api/usager/auth/reset-password` - Reset avec token
- `POST /api/usager/auth/create-password` - Création premier mot de passe
- `GET /api/usager/auth/verify-token/:token` - Vérification token reset
- `GET /api/usager/auth/me` - Profil usager connecté

**Routes Usager Emprunts**:
- `GET /api/usager/emprunts` - Liste tous les emprunts
- `GET /api/usager/emprunts/en-cours` - Emprunts en cours
- `GET /api/usager/emprunts/historique` - Historique
- `POST /api/usager/emprunts/:id/prolonger` - Demander prolongation

**Routes Prolongations (Admin)**:
- `GET /api/prolongations` - Liste des demandes
- `GET /api/prolongations/stats` - Statistiques
- `POST /api/prolongations/:id/valider` - Valider une demande
- `POST /api/prolongations/:id/refuser` - Refuser une demande

### 4. Services (backend/services/)

#### EmailService (service unifié)

**Fichier**: `backend/services/emailService.js`

**Fonctionnalités**:
- Singleton gérant l'envoi d'emails
- Intègre nodemailer + crypto pour chiffrement
- Logging automatique dans `EmailLog`
- Support des templates avec variables
- Méthodes de chiffrement/déchiffrement des mots de passe SMTP

**Méthodes principales**:
- `initialize()` - Initialise le transporteur SMTP
- `encryptPassword()` / `decryptPassword()` - Chiffrement AES-256-CBC
- `sendEmail()` - Envoi d'email brut
- `sendTemplateEmail()` - Envoi avec template
- `sendWelcomeEmail()`, `sendEmpruntConfirmation()`, etc. - Méthodes métier

**Note**: Anciennement dupliqué entre `services/` et `utils/`, maintenant unifié dans `services/`.

#### EventTriggerService

**Fichier**: `backend/services/eventTriggerService.js`

Gère les déclencheurs automatiques d'événements (ex: email bienvenue à l'inscription).

### 5. Authentification

- **Méthode**: JWT (JSON Web Tokens)
- **Middleware**: `backend/middleware/auth.js`
  - `verifyToken` - Vérifie le token JWT
  - `verifyActiveStatus` - Vérifie que l'adhérent est actif
- **Middleware roles**: `backend/middleware/checkRole.js`
  - `isAdmin()`, `isGestionnaire()`, etc.
- **Durée tokens**: 24 heures
- **Header**: `Authorization: Bearer <token>`

### 6. Système de Codes-Barres

**Utilitaire**: `backend/utils/barcodeGenerator.js`

**Formats**:
- Adhérents: `ADH00000001` (préfixe + ID sur 8 chiffres)
- Jeux: `JEU00000001`
- Type: Code128 (via bibliothèque bwip-js)

**Routes**:
- `GET /api/barcodes/adherent/:id/image` - PNG du code-barre
- `GET /api/barcodes/jeu/:id/image` - PNG du code-barre
- `POST /api/barcodes/scan` - Validation d'un scan

---

## Architecture Frontend

### 1. Système de Templates

**Fichiers**:
- `admin-navigation.js` - Configuration du menu (MENU_ITEMS)
- `admin-template.js` - Génération navbar + sidebar
- Chaque page inclut: `initTemplate('page-id')`

**Structure HTML type**:
```html
<nav id="admin-navbar"></nav>
<div class="container-fluid">
  <div class="row">
    <div id="admin-sidebar" class="col-md-2"></div>
    <main class="col-md-10">
      <!-- Contenu de la page -->
    </main>
  </div>
</div>
<script src="js/admin-template.js"></script>
<script>initTemplate('adherents');</script>
```

### 2. API Client

**Fichier**: `admin/js/api-admin.js`

Fonction principale: `apiRequest(endpoint, method, data)`
- Gère automatiquement les tokens JWT
- Gestion des erreurs centralisée
- Déconnexion auto si token expiré

### 3. Décomposition Modulaire

**Exemple: Module Adhérents**
- `adherents-table.js` - Gestion du tableau
- `adherents-form.js` - Formulaire création/édition
- `adherents-view.js` - Vue détails
- `adherents-utils.js` - Fonctions utilitaires
- `adherents-communications.js` - Envoi email/SMS

**Avantage**: Code modulaire, maintenable, réutilisable

### 4. Interface Espace Usager (frontend/usager/)

**Pages**:
- `login.html` - Connexion (email ou code-barre)
- `forgot-password.html` - Mot de passe oublié
- `reset-password.html` - Création/réinitialisation mot de passe
- `dashboard.html` - Tableau de bord avec stats et emprunts en cours
- `emprunts.html` - Liste complète des emprunts avec historique

**Authentification**: JWT séparé de l'admin, stocké dans `localStorage` (`usager_token`)

**Fonctionnalités**:
- Consultation des emprunts en cours et historique
- Demande de prolongation (automatique ou manuelle selon config)
- Message d'avertissement si item réservé par un autre adhérent

---

## Système de Prolongation

### Configuration par Module

Chaque module (ludothèque, bibliothèque, filmothèque, discothèque) dispose de ses propres paramètres:

- `prolongation_jours_[module]` - Nombre de jours par prolongation
- `prolongation_auto_max_[module]` - Nombre max de prolongations automatiques
- `prolongation_manuelle_[module]` - Autoriser les demandes manuelles après auto
- `prolongation_msg_reservation_[module]` - Afficher message si item réservé

### Flux de Prolongation

1. **Prolongation Automatique**: Si `nb_prolongations < auto_max`, la prolongation est validée instantanément
2. **Prolongation Manuelle**: Si auto épuisé et manuelle autorisée, création d'une demande en attente
3. **Validation Admin**: Interface admin pour valider/refuser les demandes manuelles

### Interface Admin

Page `parametres-emprunts.html`:
- Onglet Configuration: Réglages par module
- Onglet Demandes en attente: Validation/refus des demandes manuelles

---

## Base de Données

### Migrations

**Stratégie actuelle**:
- **Scripts JS exécutables** (préféré): `database/migrations/*.js`
  - Vérifications d'existence avant création
  - Gérés via npm scripts
- **Scripts SQL archivés**: `database/migrations/archive/*.sql`
  - Anciennes migrations SQL
  - Conservés pour référence historique

**Scripts NPM**:
```bash
npm run migrate              # Migrations Sequelize standard
npm run migrate-tarifs       # Migration tarifs cotisation
npm run migrate-email        # Migration config email
npm run setup-communications # Setup complet communications
```

### Seeds

**Fichiers**: `database/seeds/*.js`

**Scripts NPM**:
```bash
npm run seed                 # Seeds de base
npm run seed-modes-paiement  # Modes de paiement
npm run seed-event-triggers  # Déclencheurs événements
```

---

## Système de Communications

### Templates de Messages

**Modèle**: `TemplateMessage`

**Types**:
- `email` - Email uniquement
- `sms` - SMS uniquement
- `both` - Email et SMS

**Variables dynamiques**:
- `{{prenom}}`, `{{nom}}`, `{{email}}`
- `{{titre_jeu}}`, `{{date_emprunt}}`
- Etc.

### Event Triggers

**Modèle**: `EventTrigger`

**Événements supportés**:
- `ADHERENT_CREATION` - Création adhérent
- `EMPRUNT_CONFIRMATION` - Confirmation emprunt
- `EMPRUNT_RAPPEL_AVANT` - Rappel J-3
- `EMPRUNT_RAPPEL_ECHEANCE` - Rappel jour J
- `EMPRUNT_RELANCE_RETARD` - Relance retard
- `COTISATION_CONFIRMATION` - Confirmation cotisation
- `COTISATION_RAPPEL` - Rappel renouvellement

**Déclenchement**:
- Automatique via `eventTriggerService.trigger(eventCode, data)`
- Appelé depuis les controllers appropriés

---

## Scripts Utilitaires

### Scripts de Diagnostic (`database/diagnostics/`)

- `check-triggers-status.js` - Vérifier état des triggers
- `check-triggers-query.sql` - Requête SQL de vérification
- `check-email-config.sql` - Vérifier config email
- `fix-email-config.sql` - Corriger config email
- `quick-disable-email.sql` - Désactiver emails rapidement
- `manual-setup-event-triggers.js` - Setup manuel triggers

### Scripts Utils (`database/utils/`)

- `debug-start.js` - Démarrage avec debug
- `quick-migration.js` - Migration rapide
- `run-migration.js` - Exécution migration

### Scripts Batch (`.bat` à la racine)

- `git-init-liberteko.bat` - Push initial GitHub
- `git-push.bat` - Push générique
- `git-pull.bat` - Pull depuis GitHub
- `start-server.bat` - Démarrage serveur
- `restart-app.bat` - Redémarrage application
- `init-parametrage.bat` - Init paramètres
- `migrate-codes-reduction.bat` - Migration codes promo
- `run-setup.bat` - Setup complet

---

## Sécurité

### Chiffrement

**Mots de passe SMTP**:
- Algorithme: AES-256-CBC
- Clé: `EMAIL_ENCRYPTION_KEY` (env var, 32 bytes hex)
- Format stocké: `iv:encryptedData`
- Chiffrement/déchiffrement via `emailService`

**Mots de passe utilisateurs**:
- Hashage: bcrypt (10 rounds)
- Hooks Sequelize: `beforeCreate`, `beforeUpdate`

### Permissions

**Rôles**:
- `usager` - Utilisateur basique
- `benevole` - Bénévole
- `gestionnaire` - Gestionnaire
- `comptable` - Comptable
- `administrateur` - Admin complet

**Middleware**: `checkRole.js`
- `isAdmin()` - Réservé admin
- `isGestionnaire()` - Gestionnaire et supérieur
- etc.

---

## Tests

**Framework**: Jest

**Fichiers**: `tests/`

**Commande**: `npm test`

---

## Déploiement

### Développement

```bash
npm run dev    # Avec nodemon (auto-reload)
```

### Production

```bash
npm start      # Sans auto-reload
```

**Recommandation**: Utiliser PM2 pour la gestion du processus en production.

```bash
pm2 start backend/server.js --name ludotheque
pm2 save
pm2 startup
```

---

## Variables d'Environnement

**Fichier**: `.env`

```env
# Base de données
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=ludo
DB_PORT=3306

# Application
PORT=3000
NODE_ENV=development

# Sécurité
JWT_SECRET=your_jwt_secret_here
EMAIL_ENCRYPTION_KEY=your_64_hex_char_key_here
```

---

## Décisions Architecturales

### 1. Pourquoi Routes Paramétrages ?

Les routes de configuration (email, SMS, templates, tarifs) sont regroupées sous `/api/parametres` plutôt que montées directement.

**Raisons**:
- Gestion centralisée des permissions (admin/gestionnaire)
- Organisation logique: toutes les "configs" au même endroit
- Facilite la création d'une interface "Paramètres" unique
- Cohérence dans les middlewares d'authentification

### 2. Pourquoi Service Email Unifié ?

Anciennement dupliqué entre `services/` et `utils/`, maintenant un seul service.

**Avantages**:
- Élimine la duplication de code
- Un seul point de maintenance
- Logging cohérent
- Fonctions de chiffrement intégrées

### 3. Pourquoi Migrations JS > SQL ?

**Préférence pour scripts JS**:
- Vérifications d'existence avant création
- Gestion d'erreurs en JavaScript
- Intégration avec npm scripts
- Plus flexible pour logique complexe

**Scripts SQL archivés**:
- Conservés pour référence historique
- Utiles pour comprendre l'évolution du schéma

---

## Maintenance

### Ajout d'un Nouveau Modèle

1. Créer `backend/models/NouveauModele.js`
2. Définir modèle Sequelize avec DataTypes
3. Ajouter associations dans `backend/models/index.js`
4. Créer migration si besoin: `database/migrations/addNouveauModele.js`
5. Ajouter au script npm si pertinent

### Ajout d'une Nouvelle Route

1. Créer controller: `backend/controllers/nouveauController.js`
2. Créer route: `backend/routes/nouveau.js`
3. Monter dans `backend/server.js` ou `routes/parametres.js`
4. Appliquer middlewares auth appropriés

### Ajout d'un Event Trigger

1. Ajouter dans seeds: `database/seeds/seedEventTriggers.js`
2. Créer template associé: `database/seeds/seedTemplatesMessages.js`
3. Appeler depuis controller: `eventTriggerService.trigger('NOUVEAU_EVENT', data)`

---

## Ressources

- **Documentation**: README.md, CLAUDE.md
- **GitHub**: https://github.com/jepicoco/liberteko
- **Licence**: GPL 3.0
- **Version**: 1.0.0
- **Dernière mise à jour**: Décembre 2025
