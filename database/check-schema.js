/**
 * Script de diagnostic - Vérifie l'état réel du schéma de la base
 * Usage: node database/check-schema.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('\n=== Diagnostic du schéma de la base de données ===\n');

  const checks = [
    {
      name: 'Table utilisateurs',
      query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateurs'`,
      check: rows => rows.length > 0
    },
    {
      name: 'Colonne modules_autorises',
      query: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateurs' AND COLUMN_NAME = 'modules_autorises'`,
      check: rows => rows.length > 0
    },
    {
      name: 'ENUM role contient agent',
      query: `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateurs' AND COLUMN_NAME = 'role'`,
      check: rows => rows.length > 0 && rows[0].COLUMN_TYPE.includes('agent')
    },
    {
      name: 'Table prolongations',
      query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prolongations'`,
      check: rows => rows.length > 0
    },
    {
      name: 'Table configurations_llm',
      query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configurations_llm'`,
      check: rows => rows.length > 0
    },
    {
      name: 'Table thematiques',
      query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'thematiques'`,
      check: rows => rows.length > 0
    },
    {
      name: 'Colonne modules_actifs dans parametres',
      query: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'parametres' AND COLUMN_NAME = 'modules_actifs'`,
      check: rows => rows.length > 0
    },
    {
      name: 'Table compteur_pieces',
      query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'compteur_pieces'`,
      check: rows => rows.length > 0
    },
    {
      name: 'Table ecritures_comptables',
      query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ecritures_comptables'`,
      check: rows => rows.length > 0
    }
  ];

  const missing = [];
  const present = [];

  for (const check of checks) {
    try {
      const [rows] = await connection.query(check.query);
      const ok = check.check(rows);

      if (ok) {
        console.log(`✓ ${check.name}`);
        present.push(check.name);
      } else {
        console.log(`✗ ${check.name} - MANQUANT`);
        missing.push(check.name);
      }
    } catch (error) {
      console.log(`✗ ${check.name} - ERREUR: ${error.message}`);
      missing.push(check.name);
    }
  }

  console.log('\n=== Résumé ===');
  console.log(`${present.length} éléments présents`);
  console.log(`${missing.length} éléments manquants`);

  if (missing.length > 0) {
    console.log('\n⚠ Éléments manquants:');
    missing.forEach(m => console.log(`  - ${m}`));
    console.log('\n→ Vous devez exécuter les migrations manquantes !');
    console.log('  1. Réinitialisez la table migrations: DELETE FROM migrations;');
    console.log('  2. Marquez les anciennes migrations (legacy): npm run db:migrate:mark-all');
    console.log('  3. Ou exécutez manuellement les migrations manquantes');
  } else {
    console.log('\n✓ Le schéma semble complet !');
  }

  await connection.end();
}

checkSchema().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
