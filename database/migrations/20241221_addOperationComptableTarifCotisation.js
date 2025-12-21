/**
 * Migration: Ajoute le champ operation_comptable_id a tarifs_cotisation
 * Permet de lier un tarif a une operation comptable pour heriter des parametres
 */

const { sequelize } = require('../../backend/models');

async function up() {
  // Verifier si la colonne existe deja
  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'operation_comptable_id'
  `);

  if (results.length === 0) {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      ADD COLUMN operation_comptable_id INT NULL DEFAULT NULL
      COMMENT 'Operation comptable associee (herite compte, TVA, analytique)'
      AFTER ordre_affichage
    `);

    // Ajouter la foreign key
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      ADD CONSTRAINT fk_tarif_operation_comptable
      FOREIGN KEY (operation_comptable_id)
      REFERENCES parametrage_comptable_operations(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
    `);

    console.log('Colonne operation_comptable_id ajoutee a tarifs_cotisation');
  } else {
    console.log('Colonne operation_comptable_id existe deja');
  }

  console.log('Migration addOperationComptableTarifCotisation terminee');
}

async function down() {
  // Supprimer la foreign key d'abord
  try {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      DROP FOREIGN KEY fk_tarif_operation_comptable
    `);
  } catch (e) {
    // FK n'existe peut-etre pas
  }

  const [results] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tarifs_cotisation'
    AND COLUMN_NAME = 'operation_comptable_id'
  `);

  if (results.length > 0) {
    await sequelize.query(`
      ALTER TABLE tarifs_cotisation
      DROP COLUMN operation_comptable_id
    `);
    console.log('Colonne operation_comptable_id supprimee de tarifs_cotisation');
  }
}

module.exports = { up, down };
