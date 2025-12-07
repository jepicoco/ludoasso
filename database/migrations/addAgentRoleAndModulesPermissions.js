/**
 * Migration: Ajout du rôle Agent et des permissions par module
 *
 * Modifications:
 * 1. Ajoute le rôle 'agent' dans l'ENUM (entre benevole et gestionnaire)
 * 2. Ajoute le champ 'modules_autorises' (JSON) pour les permissions par module
 *
 * Nouvelle hiérarchie des rôles:
 * - usager (0)
 * - benevole (1)
 * - agent (2) - NOUVEAU
 * - gestionnaire (3)
 * - comptable (4)
 * - administrateur (5)
 *
 * Modules disponibles: ludotheque, bibliotheque, filmotheque, discotheque
 *
 * Usage:
 *   npm run migrate                    # Via le runner
 *   node database/migrations/addAgentRoleAndModulesPermissions.js [up|down]  # Direct
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function up(connection) {
  // Si pas de connexion fournie, en créer une (mode standalone)
  const standalone = !connection;
  if (standalone) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  }

  try {
    console.log('=== Migration: Ajout rôle Agent et permissions modules ===\n');

    // 1. Modifier l'ENUM des rôles pour ajouter 'agent'
    console.log('1. Modification de l\'ENUM des rôles...');

    // MySQL nécessite de modifier la colonne avec le nouvel ENUM complet
    await connection.query(`
      ALTER TABLE utilisateurs
      MODIFY COLUMN role ENUM('usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur')
      NOT NULL DEFAULT 'usager'
    `);

    console.log('   ✓ ENUM mis à jour avec le rôle agent');

    // 2. Ajouter le champ modules_autorises
    console.log('\n2. Ajout du champ modules_autorises...');

    // Vérifier si la colonne existe déjà
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'utilisateurs'
      AND COLUMN_NAME = 'modules_autorises'
    `);

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE utilisateurs
        ADD COLUMN modules_autorises JSON DEFAULT NULL
        COMMENT 'Liste des modules autorisés: ludotheque, bibliotheque, filmotheque, discotheque. NULL = tous les modules'
      `);
      console.log('   ✓ Colonne modules_autorises ajoutée');
    } else {
      console.log('   → Colonne modules_autorises existe déjà');
    }

    // 3. Mettre à jour la table utilisateurs_archives également
    console.log('\n3. Mise à jour de la table utilisateurs_archives...');

    // Vérifier si la table existe
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'utilisateurs_archives'
    `);

    if (tables.length > 0) {
      // Modifier l'ENUM
      await connection.query(`
        ALTER TABLE utilisateurs_archives
        MODIFY COLUMN role ENUM('usager', 'benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur')
        DEFAULT 'usager'
      `);

      // Vérifier si modules_autorises existe
      const [archiveColumns] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'utilisateurs_archives'
        AND COLUMN_NAME = 'modules_autorises'
      `);

      if (archiveColumns.length === 0) {
        await connection.query(`
          ALTER TABLE utilisateurs_archives
          ADD COLUMN modules_autorises JSON DEFAULT NULL
        `);
      }

      console.log('   ✓ Table utilisateurs_archives mise à jour');
    } else {
      console.log('   → Table utilisateurs_archives n\'existe pas');
    }

    console.log('\n=== Migration terminée avec succès ===');
    console.log('\nNouvelle hiérarchie des rôles:');
    console.log('  0 - usager');
    console.log('  1 - benevole');
    console.log('  2 - agent (NOUVEAU)');
    console.log('  3 - gestionnaire');
    console.log('  4 - comptable');
    console.log('  5 - administrateur');
    console.log('\nModules disponibles pour modules_autorises:');
    console.log('  - ludotheque');
    console.log('  - bibliotheque');
    console.log('  - filmotheque');
    console.log('  - discotheque');
    console.log('\nNote: NULL ou tableau vide = accès à tous les modules');

  } catch (error) {
    console.error('Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    if (standalone) await connection.end();
  }
}

async function down(connection) {
  // Si pas de connexion fournie, en créer une (mode standalone)
  const standalone = !connection;
  if (standalone) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  }

  try {
    console.log('=== Rollback: Suppression rôle Agent et permissions modules ===\n');

    // 1. Vérifier s'il y a des utilisateurs avec le rôle agent
    const [agents] = await connection.query(`
      SELECT COUNT(*) as count FROM utilisateurs WHERE role = 'agent'
    `);

    if (agents[0].count > 0) {
      console.log(`   ⚠ ${agents[0].count} utilisateur(s) avec le rôle agent détecté(s)`);
      console.log('   → Conversion en rôle benevole...');

      await connection.query(`
        UPDATE utilisateurs SET role = 'benevole' WHERE role = 'agent'
      `);
    }

    // 2. Supprimer la colonne modules_autorises
    console.log('\n1. Suppression de la colonne modules_autorises...');

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'utilisateurs'
      AND COLUMN_NAME = 'modules_autorises'
    `);

    if (columns.length > 0) {
      await connection.query(`
        ALTER TABLE utilisateurs DROP COLUMN modules_autorises
      `);
      console.log('   ✓ Colonne modules_autorises supprimée');
    }

    // 3. Restaurer l'ancien ENUM sans 'agent'
    console.log('\n2. Restauration de l\'ancien ENUM des rôles...');

    await connection.query(`
      ALTER TABLE utilisateurs
      MODIFY COLUMN role ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur')
      NOT NULL DEFAULT 'usager'
    `);

    console.log('   ✓ ENUM restauré');

    // 4. Mettre à jour utilisateurs_archives
    console.log('\n3. Mise à jour de la table utilisateurs_archives...');

    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'utilisateurs_archives'
    `);

    if (tables.length > 0) {
      // Convertir les agents en benevoles dans les archives
      await connection.query(`
        UPDATE utilisateurs_archives SET role = 'benevole' WHERE role = 'agent'
      `);

      // Supprimer modules_autorises
      const [archiveColumns] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'utilisateurs_archives'
        AND COLUMN_NAME = 'modules_autorises'
      `);

      if (archiveColumns.length > 0) {
        await connection.query(`
          ALTER TABLE utilisateurs_archives DROP COLUMN modules_autorises
        `);
      }

      // Restaurer l'ENUM
      await connection.query(`
        ALTER TABLE utilisateurs_archives
        MODIFY COLUMN role ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur')
        DEFAULT 'usager'
      `);

      console.log('   ✓ Table utilisateurs_archives restaurée');
    }

    console.log('\n=== Rollback terminé avec succès ===');

  } catch (error) {
    console.error('Erreur lors du rollback:', error.message);
    throw error;
  } finally {
    if (standalone) await connection.end();
  }
}

// Export pour le migration runner
module.exports = { up, down };

// Exécution en mode standalone
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  (async () => {
    try {
      if (command === 'up') {
        await up();
      } else if (command === 'down') {
        await down();
      } else {
        console.log('Usage: node addAgentRoleAndModulesPermissions.js [up|down]');
      }
    } catch (error) {
      console.error('Erreur:', error);
      process.exit(1);
    }
  })();
}
