# Audit de Sécurité

Tu es un expert en sécurité applicative. Réalise un audit de sécurité complet de cette application.

## Points à analyser

### 1. Authentification & Autorisation
- Vérifier l'implémentation JWT (expiration, refresh, stockage)
- Analyser le middleware `auth.js` et `checkRole.js`
- Vérifier la protection des routes sensibles
- Analyser la gestion des mots de passe (hashage bcrypt, politique)

### 2. Injection & Validation
- Rechercher les vulnérabilités SQL injection (même avec Sequelize ORM)
- Vérifier les XSS potentiels dans le frontend
- Analyser la validation des entrées (`validate.js`, express-validator)
- Vérifier l'échappement des données dans les templates

### 3. Configuration & Secrets
- Vérifier la validation des secrets au démarrage (`validateSecrets`)
- Analyser la configuration helmet/CSP
- Vérifier les variables d'environnement sensibles
- Analyser le chiffrement des credentials SMTP (`EMAIL_ENCRYPTION_KEY`)

### 4. Rate Limiting & DoS
- Analyser la configuration du rate limiting (`rateLimiter.js`)
- Vérifier les limites sur les endpoints critiques (login, reset password)
- Identifier les endpoints sans protection

### 5. Gestion des Fichiers
- Analyser l'upload de fichiers (multer)
- Vérifier les chemins de fichiers (path traversal)
- Analyser les permissions sur les fichiers statiques

### 6. Logging & Audit
- Vérifier que les événements de sécurité sont loggés (`auditLogger.js`)
- Analyser la gestion des erreurs (pas de leak d'info sensible)

## Format de sortie

Pour chaque vulnérabilité trouvée:
```
### [CRITIQUE/HAUTE/MOYENNE/BASSE] - Titre
**Fichier**: chemin:ligne
**Description**: ...
**Impact**: ...
**Recommandation**: ...
**Code exemple de correction**: (si applicable)
```

## Commencer l'audit

Analyse les fichiers suivants en priorité:
1. `backend/middleware/auth.js`
2. `backend/middleware/checkRole.js`
3. `backend/middleware/rateLimiter.js`
4. `backend/server.js` (configuration sécurité)
5. `backend/controllers/authController.js`
6. `backend/services/emailService.js` (chiffrement)

Puis élargis aux autres fichiers selon les risques identifiés.
