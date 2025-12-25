/**
 * Migration: Import ISO 2709 / MARC pour livres BDP
 *
 * Ajoute:
 * - Table import_sessions pour le suivi des imports
 * - Table lots_bdp pour les lots de la BDP
 * - Colonne dewey_code sur livres
 * - Colonne lot_bdp_id sur exemplaires_livres
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Vérifier les tables existantes
  const tables = await queryInterface.showAllTables();

  // 1. Table import_sessions
  if (!tables.includes('import_sessions')) {
    await queryInterface.sequelize.query(`
      CREATE TABLE import_sessions (
        id CHAR(36) PRIMARY KEY,
        type ENUM('iso', 'csv', 'api') NOT NULL,
        source VARCHAR(50) NULL COMMENT 'Source: bdp, bnf, savoie_biblio',
        filename VARCHAR(255) NULL,
        total_records INT DEFAULT 0,
        parsed_records JSON NULL COMMENT 'Données parsées en attente de confirmation',
        conflicts JSON NULL COMMENT 'Catégories/auteurs non résolus',
        statut ENUM('pending', 'resolved', 'imported', 'cancelled') DEFAULT 'pending',
        imported_count INT DEFAULT 0,
        error_count INT DEFAULT 0,
        import_log JSON NULL COMMENT 'Log des erreurs',
        structure_id INT NULL,
        created_by INT NULL,
        expires_at DATETIME NULL COMMENT 'Auto-cleanup après 24h',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_import_sessions_statut (statut),
        INDEX idx_import_sessions_structure (structure_id),
        INDEX idx_import_sessions_expires (expires_at),
        FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES utilisateurs(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table import_sessions créée');
  } else {
    console.log('Table import_sessions existe déjà');
  }

  // 2. Table lots_bdp
  if (!tables.includes('lots_bdp')) {
    await queryInterface.sequelize.query(`
      CREATE TABLE lots_bdp (
        id INT PRIMARY KEY AUTO_INCREMENT,
        numero_lot VARCHAR(50) NOT NULL UNIQUE COMMENT 'Numéro de lot BDP',
        date_reception DATE NULL COMMENT 'Date de réception du lot',
        date_retour_prevue DATE NULL COMMENT 'Date de retour prévue à la BDP',
        retourne BOOLEAN DEFAULT FALSE COMMENT 'Lot retourné à la BDP',
        date_retour_effectif DATE NULL COMMENT 'Date de retour effectif',
        nb_exemplaires INT DEFAULT 0 COMMENT 'Nombre d\\'exemplaires dans le lot',
        notes TEXT NULL,
        structure_id INT NULL,
        import_session_id CHAR(36) NULL COMMENT 'Session d\\'import associée',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lots_bdp_structure (structure_id),
        INDEX idx_lots_bdp_retourne (retourne),
        INDEX idx_lots_bdp_date_retour (date_retour_prevue),
        FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE SET NULL,
        FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table lots_bdp créée');
  } else {
    console.log('Table lots_bdp existe déjà');
  }

  // 3. Colonne dewey_code sur livres
  const [livresColumns] = await queryInterface.sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'livres' AND COLUMN_NAME = 'dewey_code'
  `);

  if (livresColumns.length === 0) {
    await queryInterface.sequelize.query(`
      ALTER TABLE livres
      ADD COLUMN dewey_code VARCHAR(20) NULL COMMENT 'Code Dewey (classification décimale)'
      AFTER sous_titre
    `);
    console.log('Colonne dewey_code ajoutée à livres');
  } else {
    console.log('Colonne dewey_code existe déjà sur livres');
  }

  // 4. Colonne lot_bdp_id sur exemplaires_livres
  const [exemplaireColumns] = await queryInterface.sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exemplaires_livres' AND COLUMN_NAME = 'lot_bdp_id'
  `);

  if (exemplaireColumns.length === 0) {
    await queryInterface.sequelize.query(`
      ALTER TABLE exemplaires_livres
      ADD COLUMN lot_bdp_id INT NULL COMMENT 'FK vers lot BDP si exemplaire de lot',
      ADD INDEX idx_exemplaires_livres_lot_bdp (lot_bdp_id),
      ADD CONSTRAINT fk_exemplaires_livres_lot_bdp
        FOREIGN KEY (lot_bdp_id) REFERENCES lots_bdp(id) ON DELETE SET NULL
    `);
    console.log('Colonne lot_bdp_id ajoutée à exemplaires_livres');
  } else {
    console.log('Colonne lot_bdp_id existe déjà sur exemplaires_livres');
  }

  // 5. Colonne source_import sur livres pour traçabilité
  const [sourceImportCol] = await queryInterface.sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'livres' AND COLUMN_NAME = 'source_import'
  `);

  if (sourceImportCol.length === 0) {
    await queryInterface.sequelize.query(`
      ALTER TABLE livres
      ADD COLUMN source_import VARCHAR(50) NULL COMMENT 'Source: bdp, bnf, savoie_biblio, manuel'
      AFTER dewey_code
    `);
    console.log('Colonne source_import ajoutée à livres');
  } else {
    console.log('Colonne source_import existe déjà sur livres');
  }

  console.log('Migration addImportISO terminée avec succès');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer dans l'ordre inverse des dépendances
  try {
    // 1. Supprimer colonne source_import
    await queryInterface.sequelize.query(`
      ALTER TABLE livres DROP COLUMN IF EXISTS source_import
    `);
    console.log('Colonne source_import supprimée de livres');
  } catch (err) {
    console.log('Colonne source_import déjà supprimée ou inexistante');
  }

  try {
    // 2. Supprimer FK et colonne lot_bdp_id
    await queryInterface.sequelize.query(`
      ALTER TABLE exemplaires_livres
      DROP FOREIGN KEY IF EXISTS fk_exemplaires_livres_lot_bdp
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE exemplaires_livres DROP COLUMN IF EXISTS lot_bdp_id
    `);
    console.log('Colonne lot_bdp_id supprimée de exemplaires_livres');
  } catch (err) {
    console.log('Colonne lot_bdp_id déjà supprimée ou inexistante');
  }

  try {
    // 3. Supprimer colonne dewey_code
    await queryInterface.sequelize.query(`
      ALTER TABLE livres DROP COLUMN IF EXISTS dewey_code
    `);
    console.log('Colonne dewey_code supprimée de livres');
  } catch (err) {
    console.log('Colonne dewey_code déjà supprimée ou inexistante');
  }

  try {
    // 4. Supprimer table lots_bdp
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS lots_bdp`);
    console.log('Table lots_bdp supprimée');
  } catch (err) {
    console.log('Table lots_bdp déjà supprimée ou inexistante');
  }

  try {
    // 5. Supprimer table import_sessions
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS import_sessions`);
    console.log('Table import_sessions supprimée');
  } catch (err) {
    console.log('Table import_sessions déjà supprimée ou inexistante');
  }

  console.log('Rollback addImportISO terminé');
}

module.exports = { up, down };
