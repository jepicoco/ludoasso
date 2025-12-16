/**
 * Migration: Ajouter le module reservations dans modules_actifs
 * Permet d'activer/desactiver les reservations depuis le Holodeck
 *
 * Run: node database/migrations/addModuleReservations.js
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
    console.log('=== Migration: Add Reservations Module to Holodeck ===\n');

    // Verifier si le module existe deja
    const [existing] = await connection.query(
      `SELECT id FROM modules_actifs WHERE code = 'reservations'`
    );

    if (existing.length > 0) {
      console.log('Module reservations already exists, skipping...');
    } else {
      // Trouver l'ordre d'affichage (apres scanner qui est 0)
      const [maxOrder] = await connection.query(
        `SELECT MAX(ordre_affichage) as max_ordre FROM modules_actifs WHERE code = 'scanner'`
      );
      const ordre = (maxOrder[0].max_ordre || 0) + 1;

      // Ajouter le module reservations
      await connection.query(`
        INSERT INTO modules_actifs (code, libelle, description, icone, couleur, actif, ordre_affichage, created_at, updated_at)
        VALUES (
          'reservations',
          'Reservations',
          'Systeme de reservation d''articles. Permet aux usagers de reserver des jeux, livres, films et disques. Desactive le menu Reservations et la fonctionnalite sur le site public.',
          'bookmark',
          '#6c3483',
          TRUE,
          ${ordre},
          NOW(),
          NOW()
        )
      `);

      console.log('  + Module reservations added to modules_actifs');
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
    console.log('=== Rollback: Remove Reservations Module from Holodeck ===\n');

    await connection.query(`DELETE FROM modules_actifs WHERE code = 'reservations'`);
    console.log('  - Module reservations removed from modules_actifs');

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
