/**
 * Migration: Ajoute le champ type (cotisation/prestation) a tarifs_cotisation
 */

const { sequelize } = require('../../backend/models');

async function up() {
  // Verifier si la colonne existe deja
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'type'
  `);

  if (results.length === 0) {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      ADD COLUMN type ENUM('cotisation', 'prestation') NOT NULL DEFAULT 'cotisation'
      COMMENT 'Type: cotisation (abonnement periodique) ou prestation (achat ponctuel)'
      AFTER description
    `);
    console.log('Colonne type ajoutee a tarifs_cotisation');
  } else {
    console.log('Colonne type existe deja');
  }

  // Rendre type_periode nullable pour les prestations
  const [periodeResults] = await sequelize.query(`
    SELECT IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'type_periode'
  `);

  if (periodeResults.length > 0 && periodeResults[0].IS_NULLABLE === 'NO') {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      MODIFY COLUMN type_periode ENUM('annee_civile', 'annee_scolaire', 'date_a_date') NULL DEFAULT 'annee_civile'
    `);
    console.log('Colonne type_periode modifiee en nullable');
  }

  console.log('Migration addTypeTarifCotisation terminee');
}

async function down() {
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'type'
  `);

  if (results.length > 0) {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      DROP COLUMN type
    `);
    console.log('Colonne type supprimee de tarifs_cotisation');
  }
}

module.exports = { up, down };
