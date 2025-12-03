// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

/**
 * Migration pour créer la table templates_messages
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
      "SHOW TABLES LIKE 'templates_messages'"
    );

    if (tables.length > 0) {
      console.log('ℹ️  La table templates_messages existe déjà');
    } else {
      console.log('📋 Création de la table templates_messages...');

      await connection.query(`
        CREATE TABLE templates_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code technique unique',
          libelle VARCHAR(100) NOT NULL COMMENT 'Nom du template',
          description TEXT COMMENT 'Description du template',
          type_message ENUM('email', 'sms', 'both') NOT NULL COMMENT 'Type de message supporté',
          email_objet VARCHAR(255) COMMENT 'Sujet de l\\'email',
          email_corps TEXT COMMENT 'Corps de l\\'email (HTML)',
          sms_corps TEXT COMMENT 'Corps du SMS (max 480 chars)',
          variables_disponibles JSON COMMENT 'Liste des variables disponibles',
          actif BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Template actif',
          ordre_affichage INT NOT NULL DEFAULT 0 COMMENT 'Ordre d\\'affichage',
          categorie VARCHAR(50) COMMENT 'Catégorie (Adhérent, Cotisation, Emprunt, Système)',
          icone VARCHAR(50) DEFAULT 'bi-file-text' COMMENT 'Icône Bootstrap',
          couleur VARCHAR(20) DEFAULT 'info' COMMENT 'Couleur Bootstrap',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (code),
          INDEX idx_actif (actif),
          INDEX idx_type (type_message),
          INDEX idx_categorie (categorie),
          INDEX idx_ordre (ordre_affichage)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Templates de messages pour emails et SMS'
      `);

      console.log('✅ Table templates_messages créée avec succès');
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
