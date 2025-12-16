/**
 * Migration: Module Frequentation (Comptage Visiteurs)
 *
 * Tables creees:
 * - communes (referentiel communes francaises)
 * - questionnaires_frequentation (questionnaires de comptage)
 * - questionnaire_sites (liaison multi-sites)
 * - questionnaire_communes_favorites (communes favorites avec auto-learning)
 * - enregistrements_frequentation (passages visiteurs)
 * - api_key_questionnaires (liaison tablettes-questionnaires)
 *
 * Run: node database/migrations/addModuleFrequentation.js
 * Rollback: node database/migrations/addModuleFrequentation.js down
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ludotheque',
  port: process.env.DB_PORT || 3306
};

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Migration: Add Frequentation Module ===\n');

    // 1. Ajouter le module dans modules_actifs
    const [existing] = await connection.query(
      `SELECT id FROM modules_actifs WHERE code = 'frequentation'`
    );

    if (existing.length === 0) {
      // Trouver l'ordre d'affichage (apres les autres modules fonctionnels)
      const [maxOrder] = await connection.query(
        `SELECT MAX(ordre_affichage) as max_ordre FROM modules_actifs`
      );
      const ordre = (maxOrder[0].max_ordre || 0) + 1;

      await connection.query(`
        INSERT INTO modules_actifs (code, libelle, description, icone, couleur, actif, ordre_affichage, created_at, updated_at)
        VALUES (
          'frequentation',
          'Frequentation',
          'Comptage des visiteurs. Deployer des tablettes a l''entree pour enregistrer adultes/enfants et communes de provenance. Statistiques et exports CSV/Excel/PDF.',
          'people-fill',
          '#17a2b8',
          FALSE,
          ${ordre},
          NOW(),
          NOW()
        )
      `);
      console.log('  + Module frequentation added to modules_actifs');
    } else {
      console.log('  - Module frequentation already exists, skipping...');
    }

    // 2. Table communes (referentiel)
    const [communesTable] = await connection.query(`SHOW TABLES LIKE 'communes'`);
    if (communesTable.length === 0) {
      await connection.query(`
        CREATE TABLE communes (
          id INT PRIMARY KEY AUTO_INCREMENT,
          code_insee VARCHAR(10) NOT NULL,
          nom VARCHAR(100) NOT NULL,
          code_postal VARCHAR(10),
          departement VARCHAR(3),
          region VARCHAR(100),
          population INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_code_insee (code_insee),
          INDEX idx_nom (nom),
          INDEX idx_code_postal (code_postal),
          INDEX idx_departement (departement),
          FULLTEXT INDEX ft_nom (nom)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + Table communes created');
    } else {
      console.log('  - Table communes already exists, skipping...');
    }

    // 3. Table questionnaires_frequentation
    const [questionnairesTable] = await connection.query(`SHOW TABLES LIKE 'questionnaires_frequentation'`);
    if (questionnairesTable.length === 0) {
      await connection.query(`
        CREATE TABLE questionnaires_frequentation (
          id INT PRIMARY KEY AUTO_INCREMENT,
          nom VARCHAR(100) NOT NULL,
          description TEXT,
          actif BOOLEAN DEFAULT TRUE,
          date_debut DATE,
          date_fin DATE,
          multi_site BOOLEAN DEFAULT FALSE,
          site_id INT,
          cree_par INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
          FOREIGN KEY (cree_par) REFERENCES utilisateurs(id) ON DELETE SET NULL,
          INDEX idx_actif_dates (actif, date_debut, date_fin),
          INDEX idx_site (site_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + Table questionnaires_frequentation created');
    } else {
      console.log('  - Table questionnaires_frequentation already exists, skipping...');
    }

    // 4. Table questionnaire_sites (pour multi-site)
    const [qSitesTable] = await connection.query(`SHOW TABLES LIKE 'questionnaire_sites'`);
    if (qSitesTable.length === 0) {
      await connection.query(`
        CREATE TABLE questionnaire_sites (
          id INT PRIMARY KEY AUTO_INCREMENT,
          questionnaire_id INT NOT NULL,
          site_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires_frequentation(id) ON DELETE CASCADE,
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          UNIQUE KEY uq_questionnaire_site (questionnaire_id, site_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + Table questionnaire_sites created');
    } else {
      console.log('  - Table questionnaire_sites already exists, skipping...');
    }

    // 5. Table questionnaire_communes_favorites (avec auto-learning)
    const [qCommunesTable] = await connection.query(`SHOW TABLES LIKE 'questionnaire_communes_favorites'`);
    if (qCommunesTable.length === 0) {
      await connection.query(`
        CREATE TABLE questionnaire_communes_favorites (
          id INT PRIMARY KEY AUTO_INCREMENT,
          questionnaire_id INT NOT NULL,
          commune_id INT NOT NULL,
          epingle BOOLEAN DEFAULT FALSE COMMENT 'Manuellement epingle en favori',
          ordre_affichage INT DEFAULT 0 COMMENT 'Ordre d''affichage pour les epingles',
          compteur_usage INT DEFAULT 0 COMMENT 'Nombre d''utilisations',
          pourcentage_usage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Pourcentage d''utilisation (auto-calcule)',
          dernier_usage DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires_frequentation(id) ON DELETE CASCADE,
          FOREIGN KEY (commune_id) REFERENCES communes(id) ON DELETE CASCADE,
          UNIQUE KEY uq_questionnaire_commune (questionnaire_id, commune_id),
          INDEX idx_favorites (questionnaire_id, epingle DESC, pourcentage_usage DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + Table questionnaire_communes_favorites created');
    } else {
      console.log('  - Table questionnaire_communes_favorites already exists, skipping...');
    }

    // 6. Table enregistrements_frequentation
    const [enregistrementsTable] = await connection.query(`SHOW TABLES LIKE 'enregistrements_frequentation'`);
    if (enregistrementsTable.length === 0) {
      await connection.query(`
        CREATE TABLE enregistrements_frequentation (
          id INT PRIMARY KEY AUTO_INCREMENT,
          questionnaire_id INT NOT NULL,
          site_id INT NOT NULL,
          api_key_id INT,
          commune_id INT,
          nb_adultes INT DEFAULT 0,
          nb_enfants INT DEFAULT 0,
          horodatage DATETIME NOT NULL,
          sync_status ENUM('local', 'synced') DEFAULT 'synced',
          local_id VARCHAR(36) COMMENT 'UUID pour deduplication offline',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires_frequentation(id) ON DELETE CASCADE,
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
          FOREIGN KEY (commune_id) REFERENCES communes(id) ON DELETE SET NULL,
          INDEX idx_questionnaire_date (questionnaire_id, horodatage),
          INDEX idx_site_date (site_id, horodatage),
          INDEX idx_commune (commune_id),
          INDEX idx_sync_status (sync_status),
          UNIQUE INDEX idx_local_id (local_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + Table enregistrements_frequentation created');
    } else {
      console.log('  - Table enregistrements_frequentation already exists, skipping...');
    }

    // 7. Table api_key_questionnaires (liaison tablettes-questionnaires)
    const [apiKeyQTable] = await connection.query(`SHOW TABLES LIKE 'api_key_questionnaires'`);
    if (apiKeyQTable.length === 0) {
      await connection.query(`
        CREATE TABLE api_key_questionnaires (
          id INT PRIMARY KEY AUTO_INCREMENT,
          api_key_id INT NOT NULL,
          questionnaire_id INT NOT NULL,
          site_id INT NOT NULL COMMENT 'Site ou la tablette est deployee',
          actif BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires_frequentation(id) ON DELETE CASCADE,
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          UNIQUE KEY uq_apikey_questionnaire (api_key_id, questionnaire_id),
          INDEX idx_questionnaire (questionnaire_id),
          INDEX idx_site (site_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  + Table api_key_questionnaires created');
    } else {
      console.log('  - Table api_key_questionnaires already exists, skipping...');
    }

    console.log('\n=== Migration completed successfully ===');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Rollback: Remove Frequentation Module ===\n');

    // Supprimer les tables dans l'ordre inverse (foreign keys)
    await connection.query('DROP TABLE IF EXISTS api_key_questionnaires');
    console.log('  - Table api_key_questionnaires dropped');

    await connection.query('DROP TABLE IF EXISTS enregistrements_frequentation');
    console.log('  - Table enregistrements_frequentation dropped');

    await connection.query('DROP TABLE IF EXISTS questionnaire_communes_favorites');
    console.log('  - Table questionnaire_communes_favorites dropped');

    await connection.query('DROP TABLE IF EXISTS questionnaire_sites');
    console.log('  - Table questionnaire_sites dropped');

    await connection.query('DROP TABLE IF EXISTS questionnaires_frequentation');
    console.log('  - Table questionnaires_frequentation dropped');

    await connection.query('DROP TABLE IF EXISTS communes');
    console.log('  - Table communes dropped');

    await connection.query(`DELETE FROM modules_actifs WHERE code = 'frequentation'`);
    console.log('  - Module frequentation removed from modules_actifs');

    console.log('\n=== Rollback completed successfully ===');

  } catch (error) {
    console.error('Rollback failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Execute based on command line argument
const command = process.argv[2];

if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { up, down };
