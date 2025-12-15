# Ludothèque - Application de Gestion

Application complète de gestion de ludothèque (bibliothèque de jeux de société) avec système de prêts, gestion des adhérents, cotisations et communications automatiques.

## Fonctionnalités

### Gestion des Adhérents
- CRUD complet des adhérents
- Génération automatique de codes-barres
- Gestion des rôles (usager, bénévole, gestionnaire, comptable, administrateur)
- Statuts (actif, inactif, suspendu)
- Import depuis système externe
- Impression de cartes d'adhérent avec code-barre
- Envoi d'emails et SMS manuels

### Gestion des Jeux
- Catalogue de jeux avec métadonnées complètes
- Codes-barres EAN-13 pour chaque jeu
- Gestion des statuts (disponible, emprunté, maintenance, perdu)
- Recherche et filtres avancés

### Gestion des Emprunts
- Système de prêt avec scan de codes-barres
- Suivi des dates de retour
- Détection automatique des retards
- Historique complet des emprunts
- Système de prolongation (automatique et manuelle)

### Espace Usager (Adhérents)
- Interface dédiée aux adhérents (/usager/)
- Connexion par email ou code-barre
- Tableau de bord personnel avec statistiques
- Consultation des emprunts en cours et historique
- Demande de prolongation en ligne
- Création de mot de passe par email (premier accès)
- Réinitialisation de mot de passe

### Système de Prolongation
- Configuration par module (ludothèque, bibliothèque, filmothèque, discothèque)
- Nombre de jours par prolongation (configurable)
- Prolongations automatiques (nombre max configurable)
- Prolongations manuelles soumises à validation admin
- Message d'avertissement si item réservé (désactivable)

### Gestion des Cotisations
- Tarifs personnalisables (année civile, scolaire, date à date)
- Calcul automatique des montants (fixe ou prorata)
- Codes de réduction
- Suivi des paiements

### Système de Communications
- Templates d'emails et SMS personnalisables
- Déclencheurs d'événements automatiques
- Envoi manuel depuis l'interface admin
- Variables dynamiques
- Logs des envois

### Statistiques
- Dashboard avec indicateurs clés
- Statistiques par adhérent
- Rapports d'activité

## Technologies

### Backend
- Node.js + Express.js - API REST
- MySQL - Base de données
- Sequelize - ORM
- JWT - Authentification
- bcrypt - Hashage des mots de passe
- nodemailer - Envoi d'emails
- bwip-js - Génération de codes-barres

### Frontend
- Vanilla JavaScript
- Bootstrap 5 - UI/UX responsive
- Bootstrap Icons
- SweetAlert2 - Modals et notifications

## Installation

### Prérequis
- Node.js 16+
- MySQL 5.7+
- npm ou yarn

### Étapes

1. Cloner le projet
```bash
git clone https://github.com/jepicoco/liberteko.git
cd liberteko
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer la base de données

Créez une base MySQL :
```sql
CREATE DATABASE ludo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Configurer les variables d'environnement

Copiez .env.example en .env et modifiez :
```bash
cp .env.example .env
```

Éditez .env :
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_password
DB_NAME=ludo
DB_PORT=3306

JWT_SECRET=changez_ce_secret_en_production
PORT=3000
NODE_ENV=development
```

5. Initialiser la base de données
```bash
# Migrations et seeds de base
npm run migrate
npm run seed

# Configuration du système
npm run init-parametrage

# Système de communications
npm run setup-complete-communications

# Configuration email de test (optionnel)
npm run setup-email-config
```

6. Démarrer le serveur
```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Application accessible sur http://localhost:3000

## Connexion Admin

Après l'initialisation :
- Email : admin@liberteko.local
- Mot de passe : admin123

IMPORTANT : Changez ce mot de passe en production

## Structure du Projet

```
ludotheque/
├── backend/
│   ├── controllers/      # Logique métier
│   ├── models/          # Modèles Sequelize
│   ├── routes/          # Routes API
│   ├── middleware/      # Middleware (auth, usagerAuth, maintenance)
│   ├── services/        # Services (email, event triggers)
│   └── server.js        # Point d'entrée
├── frontend/
│   ├── admin/           # Interface admin
│   │   ├── css/
│   │   ├── js/
│   │   └── *.html
│   └── usager/          # Espace adhérents
│       ├── login.html
│       ├── dashboard.html
│       ├── emprunts.html
│       └── *.html
├── database/
│   ├── migrations/      # Migrations SQL/JS
│   └── seeds/          # Données de seed
├── tests/              # Tests unitaires
└── package.json
```

## Utilisation

### Interface Admin

http://localhost:3000/admin/login.html

Pages disponibles :
- Dashboard - Vue d'ensemble et statistiques
- Adhérents - Gestion des membres
- Jeux - Catalogue des jeux
- Emprunts - Prêts et retours
- Cotisations - Gestion des adhésions
- Tarifs - Configuration des tarifs
- Communications - Templates et déclencheurs
- Statistiques - Rapports détaillés
- Paramètres Emprunts - Configuration prolongations par module

### Interface Usager (Adhérents)

http://localhost:3000/usager/login.html

Pages disponibles :
- Login - Connexion (email ou code-barre)
- Dashboard - Tableau de bord personnel
- Emprunts - Liste des emprunts avec prolongation
- Mot de passe oublié - Réinitialisation par email

### API REST

API disponible sur /api

Authentification :
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
```

Adhérents :
```
GET    /api/adherents
GET    /api/adherents/:id
POST   /api/adherents
PUT    /api/adherents/:id
DELETE /api/adherents/:id
POST   /api/adherents/:id/send-email
POST   /api/adherents/:id/send-sms
```

Jeux :
```
GET    /api/jeux
GET    /api/jeux/:id
POST   /api/jeux
PUT    /api/jeux/:id
DELETE /api/jeux/:id
```

Emprunts :
```
GET    /api/emprunts
GET    /api/emprunts/:id
POST   /api/emprunts
POST   /api/emprunts/:id/retour
```

Espace Usager :
```
POST   /api/usager/auth/login
POST   /api/usager/auth/forgot-password
POST   /api/usager/auth/reset-password
POST   /api/usager/auth/create-password
GET    /api/usager/emprunts
GET    /api/usager/emprunts/en-cours
GET    /api/usager/emprunts/historique
POST   /api/usager/emprunts/:id/prolonger
```

Prolongations (Admin) :
```
GET    /api/prolongations
GET    /api/prolongations/stats
POST   /api/prolongations/:id/valider
POST   /api/prolongations/:id/refuser
```

Documentation complète : voir CLAUDE.md

## Configuration Email

Pour activer l'envoi d'emails :

Option A - Mailtrap (recommandé pour dev)
- Créez un compte sur https://mailtrap.io
- Récupérez vos identifiants SMTP
- Configurez dans l'interface admin > Paramètres > Configurations Email

Option B - Gmail (production)
- Activez la validation en 2 étapes
- Créez un mot de passe d'application
- Configurez avec :
  - Host: smtp.gmail.com
  - Port: 587
  - Secure: Non

Option C - Ethereal (test auto)
```bash
npm run setup-email-config
```

## Tests

```bash
# Lancer tous les tests
npm test

# Vérifier les event triggers
npm run check-triggers
```

## Déploiement

### Production

1. Modifiez .env :
```env
NODE_ENV=production
JWT_SECRET=un_secret_vraiment_securise
```

2. Configurez un reverse proxy (nginx, Apache)

3. Utilisez PM2 pour le processus :
```bash
npm install -g pm2
pm2 start backend/server.js --name ludotheque
pm2 save
pm2 startup
```

## Scripts NPM

```bash
npm start              # Démarrer en production
npm run dev            # Démarrer en dev (auto-reload)
npm test               # Lancer les tests

# Base de données
npm run migrate        # Migrations Sequelize
npm run seed           # Seeds de base
npm run init-parametrage  # Init système

# Communications
npm run setup-complete-communications  # Setup complet
npm run setup-email-config            # Config email test
npm run check-triggers                # Diagnostic triggers

# Utilitaires
npm run migrate-tarifs                # Migrer tarifs
npm run seed-codes-reduction          # Seeds codes promo
```

## Documentation

- CLAUDE.md - Documentation technique complète
- BARCODE_SETUP.md - Système de codes-barres
- MIGRATION-EVENT-TRIGGERS.md - Système d'événements

## Dépannage

### Le serveur ne démarre pas
```bash
# Vérifier MySQL
mysql -u root -p

# Vérifier les dépendances
npm install

# Vérifier .env
cat .env
```

### Erreur "Email service not initialized"
```sql
-- Désactiver temporairement l'email
UPDATE configurations_email SET actif = 0;
```

### Problème de base de données
```bash
# Réinitialiser (PERTE DE DONNÉES)
npm run migrate
npm run seed
npm run init-parametrage
```

## Contribution

Les contributions sont les bienvenues.

1. Fork le projet
2. Créez une branche (git checkout -b feature/amelioration)
3. Commit (git commit -m 'Ajout fonctionnalité')
4. Push (git push origin feature/amelioration)
5. Ouvrez une Pull Request

## Licence

GNU General Public License v3.0 - Voir LICENSE pour plus de détails

## Auteur

epicoco

## Remerciements

- Claude (Anthropic) pour l'assistance au développement
- Bootstrap pour l'UI
- La communauté Node.js

Version actuelle : 1.0.0
Dernière mise à jour : Décembre 2025

## Structure du Projet

```
ludotheque/
├── backend/              # API Backend (Express.js)
│   ├── config/          # Configuration (DB, etc.)
│   ├── controllers/      # Contrôleurs métier
│   ├── models/          # Modèles Sequelize
│   ├── routes/          # Définition des routes API
│   ├── middleware/      # Middlewares personnalisés
│   ├── utils/           # Utilitaires et helpers
│   └── server.js        # Point d'entrée du serveur
├── frontend/            # Interface utilisateur
│   ├── public/          # Fichiers statiques
│   └── admin/           # Interface admin
├── database/            # Schéma et données
│   ├── migrations/      # Migrations Sequelize
│   └── seeds/           # Données de départ
├── tests/               # Tests unitaires et intégration
└── docs/                # Documentation
```

## Installation

1. Cloner le repository:
```bash
cd ludotheque
```

2. Installer les dépendances:
```bash
npm install
```

3. Configurer les variables d'environnement:
```bash
cp .env.example .env
```

4. Éditer le fichier `.env` avec vos configurations:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_password
DB_NAME=ludotheque_dev
JWT_SECRET=votre_cle_secrete
PORT=3000
NODE_ENV=development
```

## Démarrage

### Mode développement (avec auto-reload):
```bash
npm run dev
```

### Mode production:
```bash
npm start
```

## Dépendances

- **express**: Framework web Node.js
- **mysql2**: Driver MySQL pour Node.js
- **sequelize**: ORM pour la gestion de la base de données
- **jsonwebtoken**: Authentification par JWT
- **bcrypt**: Hachage sécurisé des mots de passe
- **helmet**: Sécurisation des headers HTTP
- **cors**: Gestion des requêtes cross-origin
- **dotenv**: Gestion des variables d'environnement
- **bwip-js**: Génération de codes-barres

## Scripts disponibles

- `npm start` - Démarrer le serveur
- `npm run dev` - Démarrer en mode développement avec nodemon
- `npm test` - Lancer les tests
- `npm run migrate` - Exécuter les migrations de base de données
- `npm run seed` - Charger les données de départ

## API Endpoints

### Health Check
```
GET /api/health
```

### À développer:
- `GET/POST /api/games` - Gestion des jeux
- `GET/POST /api/users` - Gestion des utilisateurs
- `GET/POST /api/bookings` - Gestion des réservations

## Configuration de la Base de Données

La connexion à la base de données est gérée via:
- File: `backend/config/database.js`
- Utilise Sequelize ORM

## Authentification

JWT (JSON Web Tokens) est utilisé pour l'authentification avec:
- Secret configuré dans `.env` (JWT_SECRET)
- À implémenter dans les middlewares

## Sécurité

- Helmet pour les headers de sécurité
- CORS activé et configurable
- Passwords hashés avec bcrypt
- Variables sensibles dans .env (non versionné)

## Développement

### Ajouter une nouvelle route:
1. Créer le contrôleur dans `backend/controllers/`
2. Définir la route dans `backend/routes/`
3. Importer la route dans `backend/server.js`

### Créer un modèle:
1. Créer le fichier dans `backend/models/`
2. Créer une migration correspondante
3. Utiliser Sequelize pour la définition

## License

ISC
