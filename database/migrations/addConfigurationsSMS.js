// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

/**
 * Migration pour créer la table configurations_sms
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
      "SHOW TABLES LIKE 'configurations_sms'"
    );

    if (tables.length > 0) {
      console.log('ℹ️  La table configurations_sms existe déjà');
    } else {
      console.log('📋 Création de la table configurations_sms...');

      await connection.query(`
        CREATE TABLE configurations_sms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          libelle VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nom de la configuration',
          provider ENUM('smsfactor') NOT NULL DEFAULT 'smsfactor' COMMENT 'Fournisseur SMS',
          api_token VARCHAR(255) NOT NULL COMMENT 'Token API SMSFactor (chiffré)',
          sender_name VARCHAR(11) COMMENT 'Nom expéditeur (11 caractères max)',
          gsm7 BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Encodage GSM7',
          sandbox BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Mode sandbox (test)',
          role_minimum ENUM('gestionnaire', 'comptable', 'administrateur') NOT NULL DEFAULT 'gestionnaire' COMMENT 'Rôle minimum requis',
          actif BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Configuration active',
          ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\\'affichage',
          par_defaut BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Configuration par défaut',
          icone VARCHAR(50) DEFAULT 'bi-phone' COMMENT 'Icône Bootstrap',
          couleur VARCHAR(20) DEFAULT 'success' COMMENT 'Couleur Bootstrap',
          notes TEXT COMMENT 'Notes internes',
          sms_envoyes INT NOT NULL DEFAULT 0 COMMENT 'Nombre de SMS envoyés',
          credits_restants DECIMAL(10, 2) COMMENT 'Crédits restants',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_actif (actif),
          INDEX idx_ordre (ordre_affichage),
          INDEX idx_par_defaut (par_defaut),
          INDEX idx_role_minimum (role_minimum)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Configurations SMS pour envoi de SMS via SMSFactor'
      `);

      console.log('✅ Table configurations_sms créée avec succès');
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
