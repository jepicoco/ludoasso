# Dépannage - Problème de connexion MySQL

## Erreur rencontrée

```
ConnectionRefusedError [SequelizeConnectionRefusedError]
code: 'ECONNREFUSED'
```

## Diagnostic

✅ Le serveur `192.168.10.13` est accessible (ping OK)
✅ Le port `3306` est ouvert
❌ MySQL refuse la connexion

## Solutions possibles

### 1. Vérifier que MySQL est démarré sur le serveur

**Sur le serveur 192.168.10.13 :**

#### Windows Server
```cmd
# Vérifier l'état du service
sc query MySQL

# Démarrer MySQL si arrêté
net start MySQL
# ou
sc start MySQL
```

#### Linux
```bash
sudo systemctl status mysql
sudo systemctl start mysql
```

### 2. Vérifier les credentials

Tester la connexion manuellement depuis votre machine :

```cmd
mysql -h 192.168.10.13 -u ludo_fcsc -p ludo
# Entrer le mot de passe: fcs+ludo
```

Si la connexion échoue, vérifier :
- Le nom d'utilisateur est correct
- Le mot de passe est correct
- L'utilisateur a les droits sur la base de données `ludo`

### 3. Vérifier les permissions MySQL

**Sur le serveur MySQL :**

```sql
-- Se connecter en root
mysql -u root -p

-- Vérifier l'utilisateur
SELECT host, user FROM mysql.user WHERE user = 'ludo_fcsc';

-- L'utilisateur doit avoir accès depuis '192.168.10.72' ou '%'
-- Si non, créer les permissions :
GRANT ALL PRIVILEGES ON ludo.* TO 'ludo_fcsc'@'%' IDENTIFIED BY 'fcs+ludo';
FLUSH PRIVILEGES;
```

### 4. Vérifier le pare-feu

**Sur le serveur 192.168.10.13 :**

```cmd
# Windows - Ajouter une règle pour MySQL
netsh advfirewall firewall add rule name="MySQL" dir=in action=allow protocol=TCP localport=3306

# Ou via l'interface graphique :
# Panneau de configuration > Pare-feu > Règles entrantes > Nouvelle règle
```

### 5. Vérifier la configuration MySQL

**Fichier my.ini (Windows) ou my.cnf (Linux) :**

```ini
[mysqld]
bind-address = 0.0.0.0
# Ne PAS utiliser 127.0.0.1 qui n'accepte que les connexions locales
```

Redémarrer MySQL après modification.

## Solution Alternative : Utiliser le serveur quand il tourne

Si vous ne pouvez pas résoudre le problème de connexion immédiatement, vous pouvez :

### Option A : Exécuter via le serveur web

1. **Démarrer le serveur normalement :**
   ```bash
   cd W:\ludo\ludotheque
   npm run dev
   ```

2. **Le serveur va créer automatiquement la table** grâce à `sequelize.sync()`

3. **Insérer les données manuellement via l'API :**
   - Se connecter à l'interface admin
   - Aller dans Communications
   - Créer les déclencheurs manuellement via l'interface

### Option B : Utiliser un script SQL direct

Si vous avez accès à phpMyAdmin ou à un client MySQL qui fonctionne :

1. **Créer la table :**
   ```sql
   CREATE TABLE `event_triggers` (
     `id` INT AUTO_INCREMENT PRIMARY KEY,
     `code` VARCHAR(50) NOT NULL UNIQUE,
     `libelle` VARCHAR(100) NOT NULL,
     `description` TEXT,
     `categorie` ENUM('adherent', 'emprunt', 'cotisation', 'systeme') NOT NULL,
     `template_email_code` VARCHAR(50),
     `template_sms_code` VARCHAR(50),
     `email_actif` BOOLEAN NOT NULL DEFAULT 0,
     `sms_actif` BOOLEAN NOT NULL DEFAULT 0,
     `delai_envoi` INT DEFAULT 0,
     `condition_envoi` TEXT,
     `ordre_affichage` INT NOT NULL DEFAULT 0,
     `icone` VARCHAR(50) DEFAULT 'bi-bell',
     `couleur` VARCHAR(20) DEFAULT 'primary',
     `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     INDEX `idx_code` (`code`),
     INDEX `idx_categorie` (`categorie`),
     INDEX `idx_email_actif` (`email_actif`),
     INDEX `idx_sms_actif` (`sms_actif`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   ```

2. **Insérer les données :**
   Voir le fichier `database/seeds/event-triggers.sql` pour les INSERT statements

## Test de connexion

Script de test simple :

```javascript
// test-db-connection.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('✅ Connexion MySQL réussie!');
    await connection.end();
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.error('Code:', error.code);
  }
}

testConnection();
```

Exécuter avec :
```bash
node test-db-connection.js
```

## Contact

Si le problème persiste après avoir vérifié tous ces points :
1. Contacter l'administrateur du serveur 192.168.10.13
2. Vérifier les logs MySQL sur le serveur
3. Essayer une connexion depuis une autre machine

---

**Note** : Une fois le problème résolu, relancer :
```bash
cd W:\ludo\ludotheque
npm run setup-event-triggers
```
