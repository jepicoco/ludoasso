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
npm test                           # Run all Jest tests
npm test -- pdfService             # Run specific test file by name
npm test -- --testPathPattern=auth # Run tests matching pattern
npm test -- --coverage             # Generate coverage report
npm test -- --watch                # Watch mode for development

# Database Setup (run in order for fresh install)
npm run migrate          # Run pending migrations
npm run seed             # Base seeds (Sequelize CLI)
npm run init-parametrage # Initialize system parameters
npm run setup-complete-communications  # Email/SMS templates + event triggers

# Migration Runner Commands
npm run db:migrate          # Run pending migrations (same as npm run migrate)
npm run db:migrate:status   # Show migration status
npm run db:migrate:down     # Rollback last migration
npm run db:migrate:reset    # Rollback all migrations
npm run db:migrate:mark-all # Mark all migrations as executed (for existing DBs)
npm run db:check-schema     # Verify DB schema matches expected tables/columns
npm run migrate-fk          # Add missing foreign keys

# Collection Module Setup
npm run setup-jeux-normalization  # Games normalization tables
npm run setup-livres              # Books module
npm run setup-films               # Films module
npm run setup-disques             # Records module

# Accounting
npm run migrate-comptabilite      # Advanced accounting tables

# LLM/AI Features
npm run migrate-llm           # LLM configuration tables
npm run migrate-thematiques   # Unified thematiques tables

# User Refactoring (Adherent → Utilisateur)
npm run migrate-utilisateurs  # Rename adherents to utilisateurs

# Feature Setup
npm run setup-nouveautes      # Article novelty/new arrivals feature
npm run setup-themes          # Site theme customization

# Utility Scripts
npm run generate-data         # Generate mass test data
npm run seed-all              # Run all seed scripts
npm run seed-themes           # Seed default themes only
npm run job-email-reminders   # Manual email reminder job
npm run check-triggers        # Diagnostic: check event triggers status
```

## Architecture

### Backend (backend/)

**Entry Point**: `server.js` - Express app with security middleware (helmet, rate limiting, CSP in production), secret validation at startup, and route mounting.

**Core Layers**:
- `models/` - 100+ Sequelize models with associations in `index.js`. Collections use normalized reference tables (genres, authors, publishers) with many-to-many junction tables.
- `controllers/` - Business logic
- `routes/` - API definitions
- `services/`:
  - `emailService.js` - SMTP with AES-256 credential encryption
  - `eventTriggerService.js` - Automated notifications on events
  - `comptabiliteService.js` - Accounting entries generation
  - `exportComptableService.js` - Multi-format accounting exports (FEC, Sage, EBP, etc.)
  - `pdfService.js` - PDF receipt/card generation
  - `codeBarreService.js` - Barcode generation (EAN-13)
  - `llmService.js` - LLM API integration for AI features
  - `thematiqueService.js` / `rechercheNaturelleService.js` - Natural language search
  - `bggService.js` - BoardGameGeek API integration
  - `eanLookupService.js` - EAN barcode lookup (UPCitemdb, BNF, OpenLibrary, TMDB, etc.)
  - `joursFeriesService.js` / `vacancesScolairesService.js` - French holidays and school breaks
- `middleware/`:
  - `auth.js` - JWT verification (`verifyToken`)
  - `checkRole.js` - Role-based access control
  - `usagerAuth.js` - Member portal authentication
  - `maintenance.js` - Maintenance mode with IP whitelist
  - `rateLimiter.js` - Rate limiting configurations
  - `validate.js` - Request validation middleware
  - `requestLogger.js` - HTTP request logging
- `utils/` - `logger.js` (Winston with daily rotation), `auditLogger.js` (structured audit events)

### Route Structure

1. **Direct routes** in server.js: `/api/auth`, `/api/utilisateurs` (alias: `/api/adherents`), `/api/jeux`, `/api/livres`, `/api/films`, `/api/disques`, `/api/emprunts`, `/api/cotisations`, `/api/tarifs-cotisation`, `/api/barcodes`, `/api/stats`

2. **Parametres routes** under `/api/parametres` (routes/parametres.js): structure, modes-paiement, codes-reduction, tarifs, configurations-email, templates-messages, llm

3. **Member portal**: `/api/usager/auth`, `/api/usager/emprunts`, `/api/prolongations`

4. **Accounting**: `/api/export-comptable/fec`, `/api/export-comptable/statistiques/:exercice`

5. **Infrastructure**: `/api/sites`, `/api/comptes-bancaires`, `/api/calendrier`, `/api/referentiels`, `/api/archives`, `/api/import`, `/api/maintenance`, `/api/public`

6. **AI Features**: `/api/thematiques`, `/api/enrichissement`

7. **Communications logs**: `/api/email-logs`, `/api/sms-logs`, `/api/configurations-sms`, `/api/event-triggers`

8. **Barcode batch printing**: `/api/codes-barres-reserves`

9. **EAN Lookup**: `/api/lookup` (external APIs for barcode data: UPCitemdb, BNF, OpenLibrary, TMDB, MusicBrainz)

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
- **Barcode Batches**: `ParametresCodesBarres`, `LotCodesBarres`, `CodeBarreUtilisateur`, `CodeBarreJeu`, `CodeBarreLivre`, `CodeBarreFilm`, `CodeBarreDisque`
- **External APIs**: `ConfigurationAPI` (EAN lookup providers with encrypted credentials)
- **Themes**: `ThemeSite` (CSS variable customization for site theming)

**Terminology Note**: The codebase uses "utilisateur" internally for the user model. The API route `/api/adherents` is maintained as an alias for `/api/utilisateurs` for backward compatibility. Frontend labels use "usager" (member) for the public-facing portal.

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
# Database
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT

# Server
PORT                  # Default: 3000
NODE_ENV              # development | production
APP_URL               # Full URL (used for CORS in production)
APP_NAME              # Application name

# Security (Min 32 chars each, validated at startup)
JWT_SECRET            # JWT signing key
EMAIL_ENCRYPTION_KEY  # AES-256-CBC for SMTP credentials

# Rate Limiting
DISABLE_RATE_LIMIT    # Set to 'true' to disable (dev only)

# Structure Info (for email/SMS templates)
STRUCTURE_NOM, STRUCTURE_ADRESSE, STRUCTURE_EMAIL, STRUCTURE_TELEPHONE
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

## Test Structure

Tests are located in `tests/unit/` with the following organization:
- `tests/unit/controllers/` - Controller unit tests
- `tests/unit/services/` - Service unit tests
- `tests/unit/middleware/` - Middleware unit tests

Jest configuration in `jest.config.js`:
- Test timeout: 10 seconds
- Mocks are automatically cleared/reset between tests
- Coverage excludes `server.js` and `models/index.js`

## Default Admin

After initialization: `admin@ludotheque.local` / `admin123`
