/**
 * Migration Runner
 * Exécute les migrations en suivant leur état dans la table `migrations`
 *
 * Usage:
 *   node database/migrate.js          # Exécute toutes les migrations pending
 *   node database/migrate.js status   # Affiche le statut des migrations
 *   node database/migrate.js up       # Exécute toutes les migrations pending
 *   node database/migrate.js down     # Rollback la dernière migration
 *   node database/migrate.js reset    # Rollback toutes les migrations
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'migrations';

// Connexion à la base de données
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

// Créer la table migrations si elle n'existe pas
async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      batch INT NOT NULL DEFAULT 1
    )
  `);
}

// Récupérer les migrations déjà exécutées
async function getExecutedMigrations(connection) {
  const [rows] = await connection.query(
    `SELECT name, batch FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`
  );
  return rows;
}

// Récupérer le dernier batch
async function getLastBatch(connection) {
  const [rows] = await connection.query(
    `SELECT MAX(batch) as lastBatch FROM ${MIGRATIONS_TABLE}`
  );
  return rows[0].lastBatch || 0;
}

// Récupérer tous les fichiers de migration
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js') && file !== 'index.js')
    .sort(); // Tri alphabétique = ordre chronologique si nommé avec timestamp
}

// Charger un module de migration
function loadMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);

  // Clear require cache pour recharger le module
  delete require.cache[require.resolve(filepath)];

  const migration = require(filepath);

  // Vérifier que la migration a les fonctions up et down
  if (typeof migration.up !== 'function') {
    throw new Error(`Migration ${filename} must export an 'up' function`);
  }
  if (typeof migration.down !== 'function') {
    throw new Error(`Migration ${filename} must export a 'down' function`);
  }

  return migration;
}

// Marquer une migration comme exécutée
async function markAsExecuted(connection, name, batch) {
  await connection.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name, batch) VALUES (?, ?)`,
    [name, batch]
  );
}

// Supprimer une migration de la table
async function removeFromExecuted(connection, name) {
  await connection.query(
    `DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
    [name]
  );
}

// Commande: status
async function status() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const executed = await getExecutedMigrations(connection);
    const executedNames = executed.map(m => m.name);
    const allFiles = getMigrationFiles();

    console.log('\n=== Statut des migrations ===\n');

    if (allFiles.length === 0) {
      console.log('Aucune migration trouvée dans', MIGRATIONS_DIR);
      return;
    }

    let pendingCount = 0;
    let executedCount = 0;

    for (const file of allFiles) {
      const isExecuted = executedNames.includes(file);
      const status = isExecuted ? '✓ Exécutée' : '○ En attente';
      const batch = isExecuted ? ` (batch ${executed.find(m => m.name === file).batch})` : '';
      const color = isExecuted ? '\x1b[32m' : '\x1b[33m';

      console.log(`${color}${status}\x1b[0m  ${file}${batch}`);

      if (isExecuted) executedCount++;
      else pendingCount++;
    }

    console.log(`\n${executedCount} exécutée(s), ${pendingCount} en attente\n`);

  } finally {
    await connection.end();
  }
}

// Commande: up (exécuter les migrations pending)
async function up() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const executed = await getExecutedMigrations(connection);
    const executedNames = executed.map(m => m.name);
    const allFiles = getMigrationFiles();

    const pending = allFiles.filter(f => !executedNames.includes(f));

    if (pending.length === 0) {
      console.log('\n✓ Aucune migration en attente\n');
      return;
    }

    const batch = (await getLastBatch(connection)) + 1;

    console.log(`\n=== Exécution de ${pending.length} migration(s) (batch ${batch}) ===\n`);

    for (const file of pending) {
      console.log(`→ ${file}...`);

      try {
        const migration = loadMigration(file);
        await migration.up(connection);
        await markAsExecuted(connection, file, batch);
        console.log(`  \x1b[32m✓ Succès\x1b[0m`);
      } catch (error) {
        console.error(`  \x1b[31m✗ Erreur: ${error.message}\x1b[0m`);
        throw error;
      }
    }

    console.log(`\n✓ ${pending.length} migration(s) exécutée(s)\n`);

  } finally {
    await connection.end();
  }
}

// Commande: down (rollback la dernière batch)
async function down() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const lastBatch = await getLastBatch(connection);

    if (lastBatch === 0) {
      console.log('\n✓ Aucune migration à annuler\n');
      return;
    }

    const [migrations] = await connection.query(
      `SELECT name FROM ${MIGRATIONS_TABLE} WHERE batch = ? ORDER BY id DESC`,
      [lastBatch]
    );

    console.log(`\n=== Rollback batch ${lastBatch} (${migrations.length} migration(s)) ===\n`);

    for (const { name } of migrations) {
      console.log(`← ${name}...`);

      try {
        const migration = loadMigration(name);
        await migration.down(connection);
        await removeFromExecuted(connection, name);
        console.log(`  \x1b[32m✓ Rollback réussi\x1b[0m`);
      } catch (error) {
        console.error(`  \x1b[31m✗ Erreur: ${error.message}\x1b[0m`);
        throw error;
      }
    }

    console.log(`\n✓ Rollback terminé\n`);

  } finally {
    await connection.end();
  }
}

// Commande: reset (rollback toutes les migrations)
async function reset() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const executed = await getExecutedMigrations(connection);

    if (executed.length === 0) {
      console.log('\n✓ Aucune migration à annuler\n');
      return;
    }

    console.log(`\n=== Reset: rollback de ${executed.length} migration(s) ===\n`);

    // Rollback dans l'ordre inverse
    const reversed = [...executed].reverse();

    for (const { name } of reversed) {
      console.log(`← ${name}...`);

      try {
        const migration = loadMigration(name);
        await migration.down(connection);
        await removeFromExecuted(connection, name);
        console.log(`  \x1b[32m✓ Rollback réussi\x1b[0m`);
      } catch (error) {
        console.error(`  \x1b[31m✗ Erreur: ${error.message}\x1b[0m`);
        // Continuer malgré l'erreur pour le reset
      }
    }

    console.log(`\n✓ Reset terminé\n`);

  } finally {
    await connection.end();
  }
}

// Commande: mark (marquer une migration comme exécutée sans l'exécuter)
async function mark(migrationName) {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const allFiles = getMigrationFiles();

    if (!allFiles.includes(migrationName)) {
      console.error(`\n✗ Migration '${migrationName}' non trouvée\n`);
      return;
    }

    const executed = await getExecutedMigrations(connection);
    if (executed.find(m => m.name === migrationName)) {
      console.log(`\n→ Migration '${migrationName}' déjà marquée comme exécutée\n`);
      return;
    }

    const batch = (await getLastBatch(connection)) + 1;
    await markAsExecuted(connection, migrationName, batch);

    console.log(`\n✓ Migration '${migrationName}' marquée comme exécutée (batch ${batch})\n`);

  } finally {
    await connection.end();
  }
}

// Commande: mark-all (marquer toutes les migrations comme exécutées)
async function markAll() {
  const connection = await getConnection();

  try {
    await ensureMigrationsTable(connection);

    const executed = await getExecutedMigrations(connection);
    const executedNames = executed.map(m => m.name);
    const allFiles = getMigrationFiles();

    const pending = allFiles.filter(f => !executedNames.includes(f));

    if (pending.length === 0) {
      console.log('\n✓ Toutes les migrations sont déjà marquées\n');
      return;
    }

    const batch = (await getLastBatch(connection)) + 1;

    console.log(`\n=== Marquage de ${pending.length} migration(s) (batch ${batch}) ===\n`);

    for (const file of pending) {
      await markAsExecuted(connection, file, batch);
      console.log(`  ✓ ${file}`);
    }

    console.log(`\n✓ ${pending.length} migration(s) marquée(s) comme exécutée(s)\n`);

  } finally {
    await connection.end();
  }
}

// Point d'entrée
const command = process.argv[2] || 'up';
const arg = process.argv[3];

(async () => {
  try {
    switch (command) {
      case 'status':
        await status();
        break;
      case 'up':
        await up();
        break;
      case 'down':
        await down();
        break;
      case 'reset':
        await reset();
        break;
      case 'mark':
        if (!arg) {
          console.error('Usage: node migrate.js mark <migration_name>');
          process.exit(1);
        }
        await mark(arg);
        break;
      case 'mark-all':
        await markAll();
        break;
      default:
        console.log(`
Usage: node database/migrate.js <command>

Commands:
  status     Affiche le statut des migrations
  up         Exécute toutes les migrations en attente
  down       Annule la dernière batch de migrations
  reset      Annule toutes les migrations
  mark       Marque une migration comme exécutée (sans l'exécuter)
  mark-all   Marque toutes les migrations comme exécutées
        `);
    }
  } catch (error) {
    console.error('\nErreur fatale:', error.message);
    process.exit(1);
  }
})();
