// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

/**
 * Migration pour créer la table configurations_email
 */
async function migrate() {
  let connection;

  try {
    console.log('🔄 Connexion à la base de données...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connecté à la base de données');

    // Vérifier si la table existe déjà
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'configurations_email'"
    );

    if (tables.length > 0) {
      console.log('ℹ️  La table configurations_email existe déjà');
    } else {
      console.log('📋 Création de la table configurations_email...');

      await connection.query(`
        CREATE TABLE configurations_email (
          id INT AUTO_INCREMENT PRIMARY KEY,
          libelle VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nom de la configuration',
          email_expediteur VARCHAR(255) NOT NULL COMMENT 'Adresse email expéditeur',
          nom_expediteur VARCHAR(100) COMMENT 'Nom affiché pour l\\'expéditeur',
          smtp_host VARCHAR(255) NOT NULL COMMENT 'Hôte SMTP',
          smtp_port INT NOT NULL DEFAULT 587 COMMENT 'Port SMTP',
          smtp_secure BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Utiliser SSL/TLS',
          smtp_user VARCHAR(255) NOT NULL COMMENT 'Nom d\\'utilisateur SMTP',
          smtp_password VARCHAR(255) NOT NULL COMMENT 'Mot de passe SMTP (chiffré)',
          smtp_timeout INT DEFAULT 10000 COMMENT 'Timeout en ms',
          smtp_require_tls BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Forcer TLS',
          role_minimum ENUM('gestionnaire', 'comptable', 'administrateur') NOT NULL DEFAULT 'gestionnaire' COMMENT 'Rôle minimum requis',
          actif BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configuration active',
          ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\\'affichage',
          par_defaut BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Configuration par défaut',
          icone VARCHAR(50) DEFAULT 'bi-envelope' COMMENT 'Icône Bootstrap',
          couleur VARCHAR(20) DEFAULT 'primary' COMMENT 'Couleur Bootstrap',
          notes TEXT COMMENT 'Notes internes',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_actif (actif),
          INDEX idx_ordre (ordre_affichage),
          INDEX idx_par_defaut (par_defaut),
          INDEX idx_role_minimum (role_minimum)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Configurations email SMTP pour envoi d\\'emails'
      `);

      console.log('✅ Table configurations_email créée avec succès');
    }

    console.log('');
    console.log('✅ Migration terminée avec succès !');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter la migration si appelé directement
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = migrate;
