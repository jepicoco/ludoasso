/**
 * Migration: Ajouter les colonnes prolongation_active_* pour chaque module
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
  console.log('Migration: Ajout des colonnes prolongation_active_*...\n');

  const modules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];

  for (const mod of modules) {
    const columnName = `prolongation_active_${mod}`;

    if (await columnExists('parametres_front', columnName)) {
      console.log(`  - ${columnName} existe deja, skip`);
    } else {
      await sequelize.query(`
        ALTER TABLE parametres_front
        ADD COLUMN ${columnName} TINYINT(1) NOT NULL DEFAULT 1
        COMMENT 'Prolongations activees pour ${mod}'
      `);
      console.log(`  + ${columnName} ajoutee`);
    }
  }

  console.log('\nMigration terminee avec succes!');
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erreur migration:', err);
    process.exit(1);
  });
