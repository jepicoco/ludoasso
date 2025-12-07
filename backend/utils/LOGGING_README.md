# Système de Logging Assotheque

Ce document décrit le système de logging mis en place pour l'application Assotheque.

## Architecture

Le système de logging est composé de trois éléments principaux :

### 1. Logger Winston (`backend/utils/logger.js`)

Le logger principal basé sur Winston avec rotation quotidienne des fichiers.

**Caractéristiques :**
- Format : `YYYY-MM-DD HH:mm:ss [LEVEL] message {metadata}`
- Rotation quotidienne des fichiers
- Logs généraux : `logs/app-%DATE%.log` (max 20MB, 14 jours de rétention)
- Logs d'erreurs : `logs/error-%DATE%.log` (max 20MB, 30 jours de rétention)
- Console colorée en mode développement uniquement
- Niveau par défaut : `info` (configurable via `LOG_LEVEL` dans `.env`)

**Utilisation :**
```javascript
const logger = require('./utils/logger');

// Logs simples
logger.info('Server started');
logger.warn('Deprecated feature used');
logger.error('Database connection failed');

// Logs avec métadonnées
logger.info('User action completed', {
  userId: 123,
  action: 'update_profile',
  duration: '245ms'
});

logger.error('API request failed', {
  endpoint: '/api/users',
  status: 500,
  error: error.message,
  stack: error.stack
});
```

### 2. Middleware HTTP Logging (`backend/middleware/requestLogger.js`)

Middleware qui log automatiquement toutes les requêtes HTTP.

**Données loggées :**
- Méthode HTTP (GET, POST, PUT, DELETE, etc.)
- URL de la requête
- Code de statut HTTP
- Durée de traitement (en ms)
- Adresse IP du client
- User-Agent
- ID utilisateur (si authentifié)

**Niveaux de log selon le status HTTP :**
- `500+` → `error`
- `400-499` → `warn`
- Autres → `info`

**Activation :**
Le middleware est déjà activé dans `server.js` après les middlewares de parsing.

### 3. Audit Logger (`backend/utils/auditLogger.js`)

Fonctions spécialisées pour logger les actions importantes du système.

**Fonctions disponibles :**

#### Authentification
```javascript
const auditLogger = require('./utils/auditLogger');

// Connexion (succès ou échec)
auditLogger.login({
  userId: 123,
  email: 'user@example.com',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  success: true
});

// Déconnexion
auditLogger.logout({
  userId: 123,
  email: 'user@example.com',
  ip: '192.168.1.1'
});

// Réinitialisation mot de passe
auditLogger.passwordReset({
  userId: 123,
  email: 'user@example.com',
  ip: '192.168.1.1',
  method: 'email' // ou 'admin', 'sms', etc.
});
```

#### Cotisations
```javascript
// Création de cotisation
auditLogger.cotisationCreated({
  cotisationId: 456,
  adherentId: 123,
  montant: 25.00,
  userId: 1, // Admin qui a créé
  modePaiement: 'carte'
});

// Annulation de cotisation
auditLogger.cotisationAnnulee({
  cotisationId: 456,
  adherentId: 123,
  montant: 25.00,
  userId: 1,
  raison: 'Demande de remboursement'
});
```

#### Gestion des adhérents
```javascript
// Archivage d'un adhérent
auditLogger.adherentArchived({
  adherentId: 123,
  nom: 'Dupont',
  prenom: 'Jean',
  userId: 1,
  raison: 'Inactivité depuis 2 ans'
});
```

#### Emprunts
```javascript
// Création d'emprunt
auditLogger.empruntCreated({
  empruntId: 789,
  adherentId: 123,
  itemType: 'jeux',
  itemId: 456,
  userId: 1
});

// Retour d'emprunt
auditLogger.empruntReturned({
  empruntId: 789,
  adherentId: 123,
  itemType: 'jeux',
  itemId: 456,
  userId: 1,
  enRetard: false
});

// Prolongation d'emprunt
auditLogger.empruntProlonged({
  empruntId: 789,
  adherentId: 123,
  itemType: 'jeux',
  userId: 1,
  nouvelleDateRetour: '2024-12-31'
});
```

#### Configuration
```javascript
// Changement de configuration
auditLogger.configChanged({
  configKey: 'duree_emprunt_max',
  oldValue: '14',
  newValue: '21',
  userId: 1,
  module: 'emprunts'
});
```

#### Sécurité
```javascript
// Tentative d'accès non autorisé
auditLogger.unauthorizedAccess({
  userId: 123,
  resource: '/api/admin/users',
  ip: '192.168.1.1',
  action: 'access_denied'
});
```

## Structure des logs

### Format des fichiers de log
```
2024-12-06 14:32:15 [INFO] GET /api/adherents 200 125ms {"method":"GET","url":"/api/adherents","status":200,"duration":"125ms","ip":"::1","userAgent":"PostmanRuntime/7.36.0","userId":1}
```

### Tags d'audit
Chaque événement d'audit utilise un tag pour faciliter le filtrage :
- `AUTH_LOGIN` - Connexions
- `AUTH_LOGOUT` - Déconnexions
- `AUTH_PASSWORD_RESET` - Réinitialisation de mot de passe
- `COTISATION_CREATED` - Création de cotisation
- `COTISATION_ANNULEE` - Annulation de cotisation
- `ADHERENT_ARCHIVED` - Archivage d'adhérent
- `CONFIG_CHANGED` - Changement de configuration
- `EMPRUNT_CREATED` - Création d'emprunt
- `EMPRUNT_RETURNED` - Retour d'emprunt
- `EMPRUNT_PROLONGED` - Prolongation d'emprunt
- `UNAUTHORIZED_ACCESS` - Accès non autorisé

## Recherche dans les logs

### Chercher toutes les connexions
```bash
grep "AUTH_LOGIN" logs/app-*.log
```

### Chercher les erreurs du jour
```bash
cat logs/error-2024-12-06.log
```

### Chercher les actions d'un utilisateur spécifique
```bash
grep '"userId":123' logs/app-*.log
```

### Chercher les erreurs 500
```bash
grep '"status":500' logs/app-*.log
```

### Chercher par tag d'audit
```bash
grep "COTISATION_CREATED" logs/app-*.log
```

## Bonnes pratiques

1. **Toujours logger les actions sensibles** : authentification, modifications financières, archivage de données
2. **Inclure le contexte** : userId, IP, timestamp sont automatiques mais ajoutez des données pertinentes
3. **Utiliser le bon niveau** :
   - `info` : événements normaux
   - `warn` : situations anormales mais non critiques
   - `error` : erreurs nécessitant attention
4. **Ne jamais logger de données sensibles** : mots de passe, numéros de carte bancaire, etc.
5. **Ajouter des métadonnées structurées** plutôt que de tout mettre dans le message

## Configuration

### Variables d'environnement
```env
# Niveau de log (debug, info, warn, error)
LOG_LEVEL=info

# En production, les logs console sont désactivés automatiquement
NODE_ENV=production
```

### Rotation des fichiers
Les fichiers sont automatiquement archivés et supprimés selon la politique de rétention :
- Logs généraux : 14 jours
- Logs d'erreurs : 30 jours
- Taille max par fichier : 20MB

## Intégration dans les contrôleurs

Exemple d'intégration complète dans un contrôleur :

```javascript
const logger = require('../utils/logger');
const auditLogger = require('../utils/auditLogger');

const createCotisation = async (req, res) => {
  try {
    const { adherentId, montant, modePaiement } = req.body;

    // Logique métier
    const cotisation = await Cotisation.create({
      adherent_id: adherentId,
      montant,
      mode_paiement: modePaiement,
      date_paiement: new Date()
    });

    // Audit log
    auditLogger.cotisationCreated({
      cotisationId: cotisation.id,
      adherentId,
      montant,
      userId: req.user.id,
      modePaiement
    });

    res.status(201).json({ success: true, cotisation });
  } catch (error) {
    // Le middleware global d'erreur loggera automatiquement
    // Mais on peut ajouter plus de contexte si nécessaire
    logger.error('Failed to create cotisation', {
      adherentId: req.body.adherentId,
      error: error.message,
      userId: req.user.id
    });
    throw error;
  }
};
```

## Monitoring et alertes

Les logs sont stockés dans le dossier `logs/` à la racine du projet. Vous pouvez :

1. **Surveiller les erreurs** avec un outil comme `tail -f logs/error-*.log`
2. **Analyser les logs** avec des outils comme `grep`, `awk`, ou des solutions comme ELK Stack
3. **Configurer des alertes** basées sur les tags d'audit critiques
4. **Archiver les logs** régulièrement pour l'audit et la conformité

## Support

Pour toute question sur le système de logging, consultez :
- Code source : `backend/utils/logger.js`, `backend/middleware/requestLogger.js`, `backend/utils/auditLogger.js`
- Documentation Winston : https://github.com/winstonjs/winston
