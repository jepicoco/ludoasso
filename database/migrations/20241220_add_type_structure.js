/**
 * Migration: Ajout du type de structure
 *
 * Types: bibliotheque, ludotheque, mediatheque, relais_petite_enfance, enfance, jeunesse, culturel_sportif
 */

async function up(connection) {
  // Verifier si la colonne existe deja
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'structures' AND COLUMN_NAME = 'type_structure'`
  );

  if (columns.length === 0) {
    await connection.query(`
      ALTER TABLE structures
      ADD COLUMN type_structure ENUM(
        'bibliotheque',
        'ludotheque',
        'mediatheque',
        'relais_petite_enfance',
        'enfance',
        'jeunesse',
        'culturel_sportif',
        'autre'
      ) DEFAULT 'ludotheque' AFTER nom,
      ADD COLUMN type_structure_label VARCHAR(100) NULL AFTER type_structure
    `);
    console.log('  Colonne type_structure ajoutee a structures');
  } else {
    console.log('  Colonne type_structure existe deja');
  }
}

async function down(connection) {
  try {
    await connection.query(`
      ALTER TABLE structures
      DROP COLUMN type_structure,
      DROP COLUMN type_structure_label
    `);
    console.log('  Colonnes type_structure supprimees');
  } catch (e) {
    console.log('  Erreur suppression colonnes:', e.message);
  }
}

module.exports = { up, down };
