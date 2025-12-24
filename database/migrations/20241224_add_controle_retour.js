/**
 * Migration: Ajoute l'état intermédiaire 'en_controle' pour les retours d'articles
 *
 * - Ajoute 'reserve' et 'en_controle' aux enums de statut des 4 types d'articles
 * - Ajoute 'controle_retour_obligatoire' à la table structures
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
    console.log('Adding en_controle status to article tables...');

    // Tables d'articles à modifier
    const tables = ['jeux', 'livres', 'films', 'disques'];
    const newEnum = "'disponible', 'emprunte', 'reserve', 'en_controle', 'maintenance', 'perdu', 'archive'";

    for (const table of tables) {
      // Vérifier si la colonne statut existe
      const [columns] = await connection.query(
        `SHOW COLUMNS FROM ${table} LIKE 'statut'`
      );

      if (columns.length > 0) {
        // Modifier l'enum pour ajouter 'reserve' et 'en_controle'
        await connection.query(`
          ALTER TABLE ${table}
          MODIFY COLUMN statut ENUM(${newEnum}) NOT NULL DEFAULT 'disponible'
        `);
        console.log(`  ✓ Table ${table}: statut enum updated`);
      } else {
        console.log(`  ⚠ Table ${table}: colonne statut non trouvée`);
      }
    }

    // Ajouter le champ controle_retour_obligatoire à structures
    console.log('Adding controle_retour_obligatoire to structures...');

    const [structureCols] = await connection.query(
      `SHOW COLUMNS FROM structures LIKE 'controle_retour_obligatoire'`
    );

    if (structureCols.length === 0) {
      await connection.query(`
        ALTER TABLE structures
        ADD COLUMN controle_retour_obligatoire BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'Si TRUE, les articles retournes passent par un etat de controle avant mise en rayon'
      `);
      console.log('  ✓ Colonne controle_retour_obligatoire ajoutée');
    } else {
      console.log('  ⚠ Colonne controle_retour_obligatoire existe déjà');
    }

    console.log('Migration completed successfully!');
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
    console.log('Reverting en_controle status from article tables...');

    // Remettre l'ancien enum (sans 'reserve' et 'en_controle')
    const tables = ['jeux', 'livres', 'films', 'disques'];
    const oldEnum = "'disponible', 'emprunte', 'maintenance', 'perdu', 'archive'";

    // D'abord, convertir les articles en_controle ou reserve vers disponible
    for (const table of tables) {
      await connection.query(`
        UPDATE ${table} SET statut = 'disponible'
        WHERE statut IN ('en_controle', 'reserve')
      `);
    }

    // Puis modifier l'enum
    for (const table of tables) {
      await connection.query(`
        ALTER TABLE ${table}
        MODIFY COLUMN statut ENUM(${oldEnum}) NOT NULL DEFAULT 'disponible'
      `);
      console.log(`  ✓ Table ${table}: statut enum reverted`);
    }

    // Supprimer la colonne controle_retour_obligatoire
    const [structureCols] = await connection.query(
      `SHOW COLUMNS FROM structures LIKE 'controle_retour_obligatoire'`
    );

    if (structureCols.length > 0) {
      await connection.query(`
        ALTER TABLE structures DROP COLUMN controle_retour_obligatoire
      `);
      console.log('  ✓ Colonne controle_retour_obligatoire supprimée');
    }

    console.log('Rollback completed successfully!');
  } finally {
    await connection.end();
  }
}

module.exports = { up, down };
