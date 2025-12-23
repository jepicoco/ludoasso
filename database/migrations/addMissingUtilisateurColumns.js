/**
 * Migration: Add missing columns to utilisateurs table
 *
 * This migration adds columns that may be missing after the
 * adherent -> utilisateur refactoring
 */

require('dotenv').config();
const { sequelize } = require('../../backend/models');

async function columnExists(tableName, columnName) {
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${tableName}'
    AND COLUMN_NAME = '${columnName}'
  `);
  return results.length > 0;
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('Migration: Add missing columns to utilisateurs table');
  console.log('='.repeat(60));
  console.log('');

  const columnsToAdd = [
    {
      name: 'date_adhesion',
      sql: `ADD COLUMN date_adhesion DATE NOT NULL COMMENT 'Date d\\'adhesion'`
      // Note: Default value managed by application layer (Sequelize model)
    },
    {
      name: 'date_fin_adhesion',
      sql: `ADD COLUMN date_fin_adhesion DATE DEFAULT NULL COMMENT 'Date de fin de cotisation (pour emprunts)'`
    },
    {
      name: 'adhesion_association',
      sql: `ADD COLUMN adhesion_association TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Membre de l\\'association (pour reduction cotisation)'`
    },
    {
      name: 'date_fin_adhesion_association',
      sql: `ADD COLUMN date_fin_adhesion_association DATE DEFAULT NULL COMMENT 'Date de fin d\\'adhesion a l\\'association'`
    },
    {
      name: 'statut',
      sql: `ADD COLUMN statut ENUM('actif', 'inactif', 'suspendu') NOT NULL DEFAULT 'actif'`
    },
    {
      name: 'photo',
      sql: `ADD COLUMN photo VARCHAR(255) DEFAULT NULL COMMENT 'URL ou chemin vers la photo'`
    },
    {
      name: 'notes',
      sql: `ADD COLUMN notes TEXT DEFAULT NULL`
    },
    {
      name: 'role',
      sql: `ADD COLUMN role ENUM('usager', 'benevole', 'gestionnaire', 'comptable', 'administrateur') NOT NULL DEFAULT 'usager'`
    },
    {
      name: 'password_reset_token',
      sql: `ADD COLUMN password_reset_token VARCHAR(255) DEFAULT NULL`
    },
    {
      name: 'password_reset_expires',
      sql: `ADD COLUMN password_reset_expires DATETIME DEFAULT NULL`
    },
    {
      name: 'password_created',
      sql: `ADD COLUMN password_created TINYINT(1) NOT NULL DEFAULT 0`
    },
    {
      name: 'civilite',
      sql: `ADD COLUMN civilite VARCHAR(10) DEFAULT NULL`
    }
  ];

  for (const col of columnsToAdd) {
    if (!(await columnExists('utilisateurs', col.name))) {
      try {
        await sequelize.query(`ALTER TABLE utilisateurs ${col.sql}`);
        console.log(`  + Added column: ${col.name}`);
      } catch (err) {
        console.log(`  - Error adding ${col.name}: ${err.message}`);
      }
    } else {
      console.log(`  - Column ${col.name} already exists`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration completed!');
  console.log('='.repeat(60));
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
