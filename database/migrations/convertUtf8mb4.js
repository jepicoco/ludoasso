/**
 * Migration: Convertir toutes les tables en utf8mb4_unicode_ci
 * Corrige les problemes d'accents et caracteres speciaux
 */

const sequelize = require('../../backend/config/sequelize');

const tables = [
  'adherents',
  'adherents_archives',
  'archives_access_logs',
  'codes_reduction',
  'configurations_email',
  'configurations_sms',
  'cotisations',
  'email_logs',
  'emprunts',
  'event_triggers',
  'jeux',
  'modes_paiement',
  'parametres_structure',
  'sms_logs',
  'tarifs_cotisation',
  'templates_messages'
];

async function migrate() {
  try {
    console.log('Connexion a la base de donnees...');
    await sequelize.authenticate();
    console.log('Connecte!\n');

    // Convertir la base de donnees elle-meme
    const dbName = process.env.DB_NAME;
    console.log(`Conversion de la base de donnees ${dbName}...`);
    await sequelize.query(`ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('Base de donnees convertie.\n');

    // Convertir chaque table
    for (const table of tables) {
      try {
        console.log(`Conversion de la table ${table}...`);
        await sequelize.query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`  -> ${table} OK`);
      } catch (error) {
        if (error.message.includes("doesn't exist")) {
          console.log(`  -> ${table} n'existe pas (ignoree)`);
        } else {
          console.error(`  -> ${table} ERREUR:`, error.message);
        }
      }
    }

    console.log('\n=== Migration terminee ===');
    console.log('Toutes les tables ont ete converties en utf8mb4_unicode_ci');
    console.log('Les accents et caracteres speciaux seront maintenant correctement geres.');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrate();
