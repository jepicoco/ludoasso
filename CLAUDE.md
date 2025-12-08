# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Assotheque is a multi-collection library management system for associations, supporting board games (Jeux), books (Livres), films, and records (Disques). Built with Node.js/Express backend and vanilla JavaScript frontend.

## Commands

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start                # Production start

# Tests
npm test                 # Run all Jest tests
npm test -- pdfService   # Run specific test file
npm test -- --coverage   # Generate coverage report

# Database Setup (run in order for fresh install)
npm run migrate          # Run pending migrations
npm run seed             # Base seeds
npm run init-parametrage # Initialize system parameters
npm run setup-complete-communications  # Email/SMS templates + event triggers

# Migration Runner Commands
npm run db:migrate          # Run pending migrations (same as npm run migrate)
npm run db:migrate:status   # Show migration status
npm run db:migrate:down     # Rollback last migration
npm run db:migrate:reset    # Rollback all migrations
npm run db:migrate:mark-all # Mark all migrations as executed (for existing DBs)
npm run db:check-schema     # Verify DB schema matches expected tables/columns

# Collection Module Setup
npm run setup-jeux-normalization  # Games normalization tables
npm run setup-livres              # Books module
npm run setup-films               # Films module
npm run setup-disques             # Records module

# Accounting (Phase 1)
node database/migrations/addPhase1Comptabilite.js up   # Create accounting tables

# LLM/AI Features
npm run migrate-llm           # LLM configuration tables
npm run migrate-thematiques   # Unified thematiques tables

# User Refactoring (Adherent → Utilisateur)
npm run migrate-utilisateurs  # Rename adherents to utilisateurs
```

## Architecture

### Backend (backend/)

**Entry Point**: `server.js` - Express app with security middleware (helmet, rate limiting, CSP in production), secret validation at startup, and route mounting.

**Core Layers**:
- `models/` - 100+ Sequelize models with associations in `index.js`. Collections use normalized reference tables (genres, authors, publishers) with many-to-many junction tables.
- `controllers/` - Business logic
- `routes/` - API definitions
- `services/` - `emailService.js` (SMTP with AES-256 encryption), `eventTriggerService.js` (automated notifications), `comptabiliteService.js` (accounting entries), `pdfService.js` (receipt generation)
- `middleware/` - `auth.js` (JWT), `checkRole.js` (RBAC), `usagerAuth.js` (member auth), `maintenance.js` (maintenance mode with IP whitelist), `rateLimiter.js`
- `utils/` - `logger.js` (Winston with daily rotation), `auditLogger.js` (structured audit events)

### Route Structure

1. **Direct routes** in server.js: `/api/auth`, `/api/utilisateurs` (alias: `/api/adherents`), `/api/jeux`, `/api/livres`, `/api/films`, `/api/disques`, `/api/emprunts`, `/api/cotisations`, `/api/tarifs-cotisation`, `/api/barcodes`, `/api/stats`

2. **Parametres routes** under `/api/parametres` (routes/parametres.js): structure, modes-paiement, codes-reduction, tarifs, configurations-email, templates-messages, llm

3. **Member portal**: `/api/usager/auth`, `/api/usager/emprunts`, `/api/prolongations`

4. **Accounting**: `/api/export-comptable/fec`, `/api/export-comptable/statistiques/:exercice`

5. **Infrastructure**: `/api/sites`, `/api/comptes-bancaires`, `/api/calendrier`, `/api/referentiels`, `/api/archives`, `/api/import`, `/api/maintenance`, `/api/public`

6. **AI Features**: `/api/thematiques`, `/api/enrichissement`

### Frontend (frontend/)

- `admin/` - Bootstrap 5 admin interface
  - `js/admin-template.js` - Navbar/sidebar generator
  - `js/api-admin.js` - API client with JWT handling
- `usager/` - Member self-service portal (login, dashboard, loan extensions)
- Public pages: `index.html`, `catalogue.html`, `fiche.html`

### Database

MySQL with Sequelize ORM. Key model groups:
- **Users**: `Utilisateur` (formerly Adherent), `UtilisateurArchive`, `Cotisation`, `Emprunt`, `Prolongation`
- **Collections**: `Jeu`, `Livre`, `Film`, `Disque` (each with normalized reference tables and many-to-many junction tables)
- **Communications**: `TemplateMessage`, `EventTrigger`, `EmailLog`, `SmsLog`, `ConfigurationEmail`, `ConfigurationSMS`
- **Accounting**: `CompteurPiece`, `EcritureComptable`, `SectionAnalytique`, `TauxTVA`, `RepartitionAnalytique`
- **AI/Thematiques**: `ConfigurationLLM`, `Thematique`, `ThematiqueAlias`, `ArticleThematique`, `EnrichissementQueue`
- **Infrastructure**: `Site`, `CompteBancaire`, `HoraireOuverture`, `FermetureExceptionnelle`, `ModuleActif`, `IpAutorisee`

**Note**: The codebase uses "utilisateur" internally and "usager" for frontend labels. The `Adherent` export is maintained as an alias for backward compatibility in `models/index.js`.

### Authentication

- JWT tokens (24h expiry) via `Authorization: Bearer <token>`
- Admin auth: `/api/auth` (token stored as `token`)
- Member auth: `/api/usager/auth` (token stored as `usager_token`)
- Roles: usager, benevole, gestionnaire, comptable, administrateur

## Key Patterns

### Adding a New Model

1. Create `backend/models/NewModel.js`
2. Register and define associations in `backend/models/index.js`
3. Create migration in `database/migrations/`

### Adding a New Route

1. Create controller in `backend/controllers/`
2. Create route file in `backend/routes/`
3. Mount in `server.js` with appropriate middleware: `app.use('/api/route', verifyToken, checkRole(['administrateur']), routeFile)`

### Event Triggers

Automated notifications via `eventTriggerService.trigger('EVENT_CODE', data)`:
- `UTILISATEUR_CREATION`, `EMPRUNT_CONFIRMATION`, `EMPRUNT_RAPPEL_AVANT`, `EMPRUNT_RAPPEL_ECHEANCE`, `EMPRUNT_RELANCE_RETARD`, `COTISATION_CONFIRMATION`, `COTISATION_RAPPEL`

### Accounting (FEC Export)

```javascript
const comptabiliteService = require('./services/comptabiliteService');
await comptabiliteService.genererEcrituresCotisation(cotisation);
// Generates balanced debit/credit entries for FEC export
```

### Logging

```javascript
const logger = require('./utils/logger');
const auditLogger = require('./utils/auditLogger');

logger.info('Message', { context: 'value' });
auditLogger.login({ userId, email, ip, userAgent, success: true });
```

Logs stored in `logs/` with daily rotation (14 days app, 30 days errors).

## Environment Variables

```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
PORT, NODE_ENV
JWT_SECRET            # Min 32 chars, validated at startup
EMAIL_ENCRYPTION_KEY  # Min 32 chars, for AES-256-CBC
```

Generate secure secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Security Features

- Secret validation at startup (rejects weak/short values)
- CSP enabled in production
- Rate limiting: 5 login attempts/15min, 3 password resets/hour, 100 API calls/15min
- Maintenance mode with IP whitelist

## Collection Module Pattern

Each collection (Jeu, Livre, Film, Disque) follows the same normalization pattern:
- **Main table**: `jeux`, `livres`, `films`, `disques`
- **Reference tables**: genres, authors/artists, publishers/studios, formats, locations
- **Junction tables**: `jeu_categories`, `livre_auteurs`, `film_acteurs`, etc.
- **Association naming**: uses `*Ref` suffix (e.g., `genresRef`, `auteursRef`) to avoid naming conflicts

When adding a new collection module:
1. Create reference table models (Genre*, Format*, Emplacement*)
2. Create junction table models for many-to-many relationships
3. Define all associations in `models/index.js`
4. Create migration in `database/migrations/add[Module]Normalization.js`

## Default Admin

After initialization: `admin@ludotheque.local` / `admin123`
