/**
 * Migration pour mettre à jour la table configurations_sms
 * - Ajoute les nouveaux providers à l'ENUM
 * - Ajoute la colonne api_url
 */

const { sequelize } = require('../../backend/models');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Update configurations_sms ===\n');

  try {
    // Vérifier si la table existe
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('configurations_sms')) {
      console.log('Table configurations_sms n\'existe pas encore. Elle sera créée au démarrage du serveur.');
      return;
    }

    // 1. Modifier l'ENUM provider pour ajouter les nouvelles valeurs
    console.log('1. Mise à jour de l\'ENUM provider...');
    try {
      await sequelize.query(`
        ALTER TABLE configurations_sms
        MODIFY COLUMN provider ENUM('smsfactor', 'brevo', 'twilio', 'ovh', 'autre')
        NOT NULL DEFAULT 'smsfactor'
      `);
      console.log('   ✓ ENUM provider mis à jour');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('   - ENUM provider déjà à jour');
      } else {
        console.log('   ⚠ Erreur ENUM:', error.message);
      }
    }

    // 2. Ajouter la colonne api_url si elle n'existe pas
    console.log('2. Ajout de la colonne api_url...');
    try {
      const [columns] = await sequelize.query(`
        SHOW COLUMNS FROM configurations_sms LIKE 'api_url'
      `);

      if (columns.length === 0) {
        await sequelize.query(`
          ALTER TABLE configurations_sms
          ADD COLUMN api_url VARCHAR(255) NULL
          COMMENT 'URL de base de l\\'API SMS (ex: https://api.smsfactor.com)'
          AFTER provider
        `);
        console.log('   ✓ Colonne api_url ajoutée');
      } else {
        console.log('   - Colonne api_url existe déjà');
      }
    } catch (error) {
      console.log('   ⚠ Erreur api_url:', error.message);
    }

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('\n✗ Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Exécuter la migration
migrate()
  .then(() => {
    console.log('\nMigration completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
