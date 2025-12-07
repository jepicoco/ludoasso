# Quick Start - Système de Logging

## Utilisation rapide

### 1. Logger de base
```javascript
const logger = require('./utils/logger');

logger.info('Something happened');
logger.warn('Something unusual happened');
logger.error('Something bad happened');

// Avec métadonnées
logger.info('User performed action', {
  userId: 123,
  action: 'update_profile'
});
```

### 2. Audit Logger
```javascript
const auditLogger = require('./utils/auditLogger');

// Login
auditLogger.login({
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.get('user-agent'),
  success: true
});

// Cotisation
auditLogger.cotisationCreated({
  cotisationId: cotisation.id,
  adherentId: adherent.id,
  montant: 25.00,
  userId: req.user.id,
  modePaiement: 'carte'
});

// Emprunt
auditLogger.empruntCreated({
  empruntId: emprunt.id,
  adherentId: adherent.id,
  itemType: 'jeux',
  itemId: jeu.id,
  userId: req.user.id
});
```

### 3. Middleware HTTP (déjà activé)
Rien à faire - toutes les requêtes HTTP sont automatiquement loggées.

## Test rapide
```bash
node backend/utils/test-logger.js
```

## Voir les logs
```bash
# Tous les logs
cat logs/app-*.log

# Uniquement les erreurs
cat logs/error-*.log

# Chercher les connexions
grep "AUTH_LOGIN" logs/app-*.log
```

## Fonctions disponibles
- `auditLogger.login(data)`
- `auditLogger.logout(data)`
- `auditLogger.passwordReset(data)`
- `auditLogger.cotisationCreated(data)`
- `auditLogger.cotisationAnnulee(data)`
- `auditLogger.adherentArchived(data)`
- `auditLogger.configChanged(data)`
- `auditLogger.empruntCreated(data)`
- `auditLogger.empruntReturned(data)`
- `auditLogger.empruntProlonged(data)`
- `auditLogger.unauthorizedAccess(data)`

## Documentation complète
- `LOGGING_README.md` - Guide complet
- `LOGGING_INTEGRATION_EXAMPLE.md` - Exemples d'intégration
