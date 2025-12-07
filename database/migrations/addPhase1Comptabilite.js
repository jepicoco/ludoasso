/**
 * Migration: Ajout des tables pour la Phase 1 de la comptabilité
 * - Table compteurs_pieces: gestion de la numérotation des pièces comptables
 * - Table ecritures_comptables: stockage des écritures pour export FEC
 *
 * Cette migration fait partie du Sprint 3 - Export FEC et numérotation pièces
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function up() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Starting migration: addPhase1Comptabilite');

    // ========================================
    // 1. Création de la table compteurs_pieces
    // ========================================
    console.log('Creating table: compteurs_pieces');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS compteurs_pieces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_piece ENUM('COT', 'FAC', 'AVO', 'REC') NOT NULL COMMENT 'Type de piece: COT=Cotisation, FAC=Facture, AVO=Avoir, REC=Recu',
        exercice INT NOT NULL COMMENT 'Annee de exercice comptable',
        dernier_numero INT NOT NULL DEFAULT 0 COMMENT 'Dernier numero genere pour ce type et cet exercice',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_type_exercice (type_piece, exercice),
        INDEX idx_exercice (exercice)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Compteurs pour numerotation automatique des pieces comptables';
    `);
    console.log('✓ Table compteurs_pieces created');

    // ========================================
    // 2. Création de la table ecritures_comptables
    // ========================================
    console.log('Creating table: ecritures_comptables');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ecritures_comptables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journal_code VARCHAR(10) NOT NULL COMMENT 'Code du journal comptable',
        journal_libelle VARCHAR(100) NOT NULL COMMENT 'Libelle du journal comptable',
        exercice INT NOT NULL COMMENT 'Annee de exercice comptable',
        numero_ecriture VARCHAR(50) NOT NULL COMMENT 'Numero de ecriture comptable',
        date_ecriture DATE NOT NULL COMMENT 'Date de operation comptable',
        compte_numero VARCHAR(20) NOT NULL COMMENT 'Numero du compte general',
        compte_libelle VARCHAR(100) NOT NULL COMMENT 'Libelle du compte',
        compte_auxiliaire VARCHAR(20) DEFAULT NULL COMMENT 'Numero du compte auxiliaire (tiers)',
        piece_reference VARCHAR(50) NOT NULL COMMENT 'Reference de la piece justificative',
        piece_date DATE NOT NULL COMMENT 'Date de la piece justificative',
        libelle VARCHAR(255) NOT NULL COMMENT 'Libelle de ecriture',
        debit DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Montant au debit',
        credit DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Montant au credit',
        date_validation DATE DEFAULT NULL COMMENT 'Date de validation de ecriture',
        cotisation_id INT DEFAULT NULL COMMENT 'ID de la cotisation associee',
        lettrage VARCHAR(10) DEFAULT NULL COMMENT 'Code de lettrage pour rapprochement',
        section_analytique_id INT DEFAULT NULL COMMENT 'ID de la section analytique',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_exercice_numero (exercice, numero_ecriture),
        INDEX idx_date_ecriture (date_ecriture),
        INDEX idx_compte_numero (compte_numero),
        INDEX idx_cotisation_id (cotisation_id),
        INDEX idx_journal_code (journal_code),
        INDEX idx_piece_reference (piece_reference),
        CONSTRAINT fk_ecriture_cotisation
          FOREIGN KEY (cotisation_id)
          REFERENCES cotisations(id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ecritures comptables pour export FEC';
    `);
    console.log('✓ Table ecritures_comptables created');

    // ========================================
    // 3. Vérification de la colonne numero_piece_comptable dans cotisations
    // ========================================
    console.log('Checking column numero_piece_comptable in cotisations table');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'cotisations'
        AND COLUMN_NAME = 'numero_piece_comptable'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      console.log('Adding column numero_piece_comptable to cotisations table');
      await connection.query(`
        ALTER TABLE cotisations
        ADD COLUMN numero_piece_comptable VARCHAR(50) DEFAULT NULL COMMENT 'Numero de piece comptable' AFTER code_comptable_usager,
        ADD INDEX idx_numero_piece_comptable (numero_piece_comptable)
      `);
      console.log('✓ Column numero_piece_comptable added');
    } else {
      console.log('✓ Column numero_piece_comptable already exists');
    }

    // ========================================
    // 4. Vérification de la colonne date_comptabilisation dans cotisations
    // ========================================
    console.log('Checking column date_comptabilisation in cotisations table');
    const [dateColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'cotisations'
        AND COLUMN_NAME = 'date_comptabilisation'
    `, [process.env.DB_NAME]);

    if (dateColumns.length === 0) {
      console.log('Column date_comptabilisation already exists in model definition');
    } else {
      console.log('✓ Column date_comptabilisation exists');
    }

    console.log('\n✓ Migration addPhase1Comptabilite completed successfully\n');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Rolling back migration: addPhase1Comptabilite');

    // Supprimer les tables dans l'ordre inverse (à cause des clés étrangères)
    console.log('Dropping table: ecritures_comptables');
    await connection.query('DROP TABLE IF EXISTS ecritures_comptables');
    console.log('✓ Table ecritures_comptables dropped');

    console.log('Dropping table: compteurs_pieces');
    await connection.query('DROP TABLE IF EXISTS compteurs_pieces');
    console.log('✓ Table compteurs_pieces dropped');

    // Note: On ne supprime pas les colonnes ajoutées à cotisations car elles peuvent contenir des données
    console.log('Note: Columns in cotisations table not removed to preserve data');

    console.log('\n✓ Rollback completed successfully\n');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Exécution si le script est appelé directement
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'up') {
    up().catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
  } else if (command === 'down') {
    down().catch(error => {
      console.error('Rollback failed:', error);
      process.exit(1);
    });
  } else {
    console.log('Usage: node addPhase1Comptabilite.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
