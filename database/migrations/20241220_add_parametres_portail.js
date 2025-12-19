/**
 * Migration: Ajout colonne parametres JSON aux groupes_frontend
 *
 * Permet de stocker des overrides de ParametresFront par portail.
 * Pattern: portal.parametres[key] ?? ParametresFront[key]
 */

async function up(connection) {
  // Verifier si la colonne existe deja
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groupes_frontend' AND COLUMN_NAME = 'parametres'`
  );

  if (columns.length === 0) {
    await connection.query(`
      ALTER TABLE groupes_frontend
      ADD COLUMN parametres JSON NULL COMMENT 'Overrides des parametres ParametresFront pour ce portail'
    `);
    console.log('  Colonne parametres ajoutee a groupes_frontend');
  } else {
    console.log('  Colonne parametres existe deja');
  }

  // Ajouter aussi des colonnes utiles frequemment accedees (index possible)
  const [colNomSite] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groupes_frontend' AND COLUMN_NAME = 'nom_affiche'`
  );

  if (colNomSite.length === 0) {
    await connection.query(`
      ALTER TABLE groupes_frontend
      ADD COLUMN nom_affiche VARCHAR(200) NULL COMMENT 'Nom affiche sur le portail (override nom_site)',
      ADD COLUMN favicon_url VARCHAR(500) NULL COMMENT 'URL du favicon',
      ADD COLUMN meta_description TEXT NULL COMMENT 'Meta description pour SEO',
      ADD COLUMN email_contact VARCHAR(255) NULL COMMENT 'Email de contact du portail',
      ADD COLUMN telephone_contact VARCHAR(20) NULL COMMENT 'Telephone de contact',
      ADD COLUMN mode_maintenance BOOLEAN DEFAULT FALSE COMMENT 'Mode maintenance specifique au portail',
      ADD COLUMN message_maintenance TEXT NULL COMMENT 'Message de maintenance specifique'
    `);
    console.log('  Colonnes frequentes ajoutees a groupes_frontend');
  }
}

async function down(connection) {
  try {
    await connection.query(`
      ALTER TABLE groupes_frontend
      DROP COLUMN IF EXISTS parametres,
      DROP COLUMN IF EXISTS nom_affiche,
      DROP COLUMN IF EXISTS favicon_url,
      DROP COLUMN IF EXISTS meta_description,
      DROP COLUMN IF EXISTS email_contact,
      DROP COLUMN IF EXISTS telephone_contact,
      DROP COLUMN IF EXISTS mode_maintenance,
      DROP COLUMN IF EXISTS message_maintenance
    `);
    console.log('  Colonnes parametres portail supprimees');
  } catch (e) {
    console.log('  Erreur suppression colonnes:', e.message);
  }
}

module.exports = { up, down };
