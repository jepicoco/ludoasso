/**
 * Migration: Ajoute le champ criteres JSON a tarifs_cotisation
 * Criteres d'eligibilite dynamiques : age, sexe, commune, adhesion, tags
 */

const { sequelize } = require('../../backend/models');

async function up() {
  // Verifier si la colonne existe deja
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'criteres'
  `);

  if (results.length === 0) {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      ADD COLUMN criteres JSON NULL DEFAULT NULL
      COMMENT 'Criteres d\\'eligibilite dynamiques (age, sexe, commune, adhesion, tags)'
      AFTER par_defaut
    `);
    console.log('Colonne criteres ajoutee a tarifs_cotisation');
  } else {
    console.log('Colonne criteres existe deja');
  }

  console.log('Migration addCriteresTarifCotisation terminee');
}

async function down() {
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'criteres'
  `);

  if (results.length > 0) {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      DROP COLUMN criteres
    `);
    console.log('Colonne criteres supprimee de tarifs_cotisation');
  }
}

module.exports = { up, down };
