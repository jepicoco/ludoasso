/**
 * Migration: Add reservations system
 *
 * Run: node database/migrations/addReservations.js up
 * Rollback: node database/migrations/addReservations.js down
 *
 * This migration:
 * 1. Adds reservation limit and expiration fields to parametres_front table
 * 2. Creates reservations table for article reservations
 * 3. Creates limites_reservation_genre table for per-genre reservation limits
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
    console.log('=== Migration: Add Reservations System ===\n');

    // 1. Add reservation limit and expiration fields to parametres_front for each module
    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

    for (const mod of modules) {
      // Check if columns already exist
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM parametres_front LIKE 'limite_reservation_${mod}'`
      );

      if (columns.length === 0) {
        console.log(`Adding reservation columns for ${mod}...`);

        await connection.query(`
          ALTER TABLE parametres_front
          ADD COLUMN limite_reservation_${mod} INT DEFAULT 2 COMMENT 'Limite generale reservations ${mod}',
          ADD COLUMN limite_reservation_nouveaute_${mod} INT DEFAULT 0 COMMENT 'Limite reservations nouveautes ${mod}',
          ADD COLUMN reservation_expiration_jours_${mod} INT DEFAULT 15 COMMENT 'Jours avant expiration reservation ${mod}',
          ADD COLUMN reservation_active_${mod} BOOLEAN DEFAULT TRUE COMMENT 'Reservations actives pour ${mod}'
        `);

        console.log(`  + limite_reservation_${mod}`);
        console.log(`  + limite_reservation_nouveaute_${mod}`);
        console.log(`  + reservation_expiration_jours_${mod}`);
        console.log(`  + reservation_active_${mod}`);
      } else {
        console.log(`Reservation columns for ${mod} already exist, skipping...`);
      }
    }

    // 2. Create reservations table
    const [reservationsTable] = await connection.query("SHOW TABLES LIKE 'reservations'");

    if (reservationsTable.length === 0) {
      console.log('\nCreating reservations table...');

      await connection.query(`
        CREATE TABLE reservations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          utilisateur_id INT NOT NULL COMMENT 'FK vers utilisateurs',
          jeu_id INT NULL COMMENT 'FK vers jeux (si reservation jeu)',
          livre_id INT NULL COMMENT 'FK vers livres (si reservation livre)',
          film_id INT NULL COMMENT 'FK vers films (si reservation film)',
          cd_id INT NULL COMMENT 'FK vers disques (si reservation disque)',
          statut ENUM('en_attente', 'prete', 'empruntee', 'expiree', 'annulee') NOT NULL DEFAULT 'en_attente' COMMENT 'Statut de la reservation',
          position_queue INT NOT NULL DEFAULT 1 COMMENT 'Position dans la file d attente',
          date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de creation de la reservation',
          date_notification TIMESTAMP NULL COMMENT 'Date de notification (quand article disponible)',
          date_expiration TIMESTAMP NULL COMMENT 'Date limite de recuperation',
          date_conversion TIMESTAMP NULL COMMENT 'Date de conversion en emprunt',
          emprunt_id INT NULL COMMENT 'FK vers emprunts (apres conversion)',
          commentaire TEXT NULL COMMENT 'Commentaire optionnel',
          notifie BOOLEAN DEFAULT FALSE COMMENT 'Usager notifie de la disponibilite',
          prolongations INT DEFAULT 0 COMMENT 'Nombre de prolongations accordees',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_utilisateur (utilisateur_id),
          INDEX idx_jeu (jeu_id),
          INDEX idx_livre (livre_id),
          INDEX idx_film (film_id),
          INDEX idx_cd (cd_id),
          INDEX idx_statut (statut),
          INDEX idx_position_queue (position_queue),
          INDEX idx_date_expiration (date_expiration),
          CONSTRAINT fk_reservation_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reservation_jeu FOREIGN KEY (jeu_id) REFERENCES jeux(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reservation_livre FOREIGN KEY (livre_id) REFERENCES livres(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reservation_film FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reservation_cd FOREIGN KEY (cd_id) REFERENCES disques(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reservation_emprunt FOREIGN KEY (emprunt_id) REFERENCES emprunts(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Reservations d articles par les usagers'
      `);

      console.log('  + Table reservations created');
    } else {
      console.log('\nTable reservations already exists, skipping...');
    }

    // 3. Create limites_reservation_genre table
    const [limitesTable] = await connection.query("SHOW TABLES LIKE 'limites_reservation_genre'");

    if (limitesTable.length === 0) {
      console.log('\nCreating limites_reservation_genre table...');

      await connection.query(`
        CREATE TABLE limites_reservation_genre (
          id INT AUTO_INCREMENT PRIMARY KEY,
          module ENUM('ludotheque', 'bibliotheque', 'filmotheque', 'discotheque') NOT NULL,
          genre_id INT NOT NULL COMMENT 'ID du genre (selon le module)',
          genre_nom VARCHAR(100) NOT NULL COMMENT 'Nom du genre (cache pour affichage)',
          limite_max INT NOT NULL DEFAULT 2 COMMENT 'Limite max reservations pour ce genre',
          actif BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_module_genre (module, genre_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Limites reservations par genre et par module'
      `);

      console.log('  + Table limites_reservation_genre created');
    } else {
      console.log('\nTable limites_reservation_genre already exists, skipping...');
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
    console.log('=== Rollback: Remove Reservations System ===\n');

    // 1. Drop columns from parametres_front
    const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

    for (const mod of modules) {
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM parametres_front LIKE 'limite_reservation_${mod}'`
      );

      if (columns.length > 0) {
        console.log(`Removing reservation columns for ${mod}...`);

        await connection.query(`
          ALTER TABLE parametres_front
          DROP COLUMN limite_reservation_${mod},
          DROP COLUMN limite_reservation_nouveaute_${mod},
          DROP COLUMN reservation_expiration_jours_${mod},
          DROP COLUMN reservation_active_${mod}
        `);

        console.log(`  - Columns removed for ${mod}`);
      }
    }

    // 2. Drop limites_reservation_genre table
    const [limitesTable] = await connection.query("SHOW TABLES LIKE 'limites_reservation_genre'");

    if (limitesTable.length > 0) {
      console.log('\nDropping limites_reservation_genre table...');
      await connection.query('DROP TABLE limites_reservation_genre');
      console.log('  - Table dropped');
    }

    // 3. Drop reservations table
    const [reservationsTable] = await connection.query("SHOW TABLES LIKE 'reservations'");

    if (reservationsTable.length > 0) {
      console.log('\nDropping reservations table...');
      await connection.query('DROP TABLE reservations');
      console.log('  - Table dropped');
    }

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

if (command === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node addReservations.js [up|down]');
  process.exit(1);
}
