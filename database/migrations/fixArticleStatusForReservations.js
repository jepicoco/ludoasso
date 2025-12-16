/**
 * Migration: Corriger le statut des articles qui ont des reservations actives
 *
 * Met a jour le statut des articles (jeux, livres, films, disques) a "reserve"
 * s'ils ont des reservations en attente ou prete.
 *
 * Run: node database/migrations/fixArticleStatusForReservations.js
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
    console.log('=== Migration: Fix Article Status for Reservations ===\n');

    // Liste des tables d'articles et leurs cles etrangeres dans reservations
    const articleTables = [
      { table: 'jeux', fk: 'jeu_id', label: 'Jeux' },
      { table: 'livres', fk: 'livre_id', label: 'Livres' },
      { table: 'films', fk: 'film_id', label: 'Films' },
      { table: 'disques', fk: 'cd_id', label: 'Disques' }
    ];

    let totalUpdated = 0;

    for (const { table, fk, label } of articleTables) {
      // Trouver les articles avec des reservations actives mais statut != 'reserve'
      const [rows] = await connection.query(`
        SELECT DISTINCT a.id, a.titre, a.statut
        FROM ${table} a
        INNER JOIN reservations r ON r.${fk} = a.id
        WHERE r.statut IN ('en_attente', 'prete')
          AND a.statut = 'disponible'
      `);

      if (rows.length > 0) {
        console.log(`${label}: ${rows.length} article(s) a corriger`);

        for (const row of rows) {
          console.log(`  - [${row.id}] ${row.titre}: ${row.statut} -> reserve`);
        }

        // Mettre a jour les articles
        const ids = rows.map(r => r.id);
        await connection.query(`
          UPDATE ${table}
          SET statut = 'reserve'
          WHERE id IN (?)
        `, [ids]);

        totalUpdated += rows.length;
      } else {
        console.log(`${label}: Aucun article a corriger`);
      }
    }

    console.log(`\n=== Migration terminee: ${totalUpdated} article(s) corrige(s) ===`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  console.log('Rollback not available for this migration.');
  console.log('Articles status can only be restored manually.');
}

// Execute based on command line argument
const command = process.argv[2];

if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { up, down };
