/**
 * Migration: Ajouter le statut 'reserve' aux tables d'articles
 *
 * Modifie l'ENUM statut des tables jeux, livres, films, disques
 * pour inclure le statut 'reserve' (et autres statuts manquants).
 *
 * Run: node database/migrations/addReserveStatusToArticles.js
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

// Statuts complets pour les articles
const ARTICLE_STATUTS = "'disponible','emprunte','reserve','en_reparation','indisponible','archive','perdu'";

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Migration: Add Reserve Status to Articles ===\n');

    const tables = ['jeux', 'livres', 'films', 'disques'];

    for (const table of tables) {
      // Verifier si la colonne statut existe
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table} WHERE Field = 'statut'`);

      if (columns.length === 0) {
        console.log(`${table}: Colonne statut non trouvee, skip`);
        continue;
      }

      const currentType = columns[0].Type;

      // Verifier si 'reserve' est deja dans l'enum
      if (currentType.includes("'reserve'")) {
        console.log(`${table}: Statut 'reserve' deja present`);
        continue;
      }

      console.log(`${table}: Modification de l'ENUM statut...`);
      console.log(`  Avant: ${currentType}`);

      await connection.query(`
        ALTER TABLE ${table}
        MODIFY COLUMN statut ENUM(${ARTICLE_STATUTS}) NOT NULL DEFAULT 'disponible'
      `);

      console.log(`  Apres: ENUM(${ARTICLE_STATUTS})`);
    }

    console.log('\n=== Migration terminee ===');

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
    console.log('=== Rollback: Remove Reserve Status from Articles ===\n');
    console.log('Note: Cette operation peut echouer si des articles ont le statut "reserve"');

    const tables = ['jeux', 'livres', 'films', 'disques'];
    const ORIGINAL_STATUTS = "'disponible','emprunte','maintenance','perdu','archive'";

    for (const table of tables) {
      // D'abord, remettre les articles "reserve" en "disponible"
      await connection.query(`UPDATE ${table} SET statut = 'disponible' WHERE statut = 'reserve'`);
      await connection.query(`UPDATE ${table} SET statut = 'disponible' WHERE statut IN ('en_reparation', 'indisponible')`);

      await connection.query(`
        ALTER TABLE ${table}
        MODIFY COLUMN statut ENUM(${ORIGINAL_STATUTS}) NOT NULL DEFAULT 'disponible'
      `);

      console.log(`${table}: ENUM restaure`);
    }

    console.log('\n=== Rollback termine ===');

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
