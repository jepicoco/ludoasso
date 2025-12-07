const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Migration: Ajout de la colonne maintenance_key ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    // Vérifier si la colonne existe déjà
    console.log('Vérification des colonnes dans parametres_front...');

    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'parametres_front'
    `, [process.env.DB_NAME]);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('maintenance_key')) {
      console.log('Ajout de la colonne maintenance_key...');
      await connection.execute(`
        ALTER TABLE parametres_front
        ADD COLUMN maintenance_key VARCHAR(64) NULL
        COMMENT 'Cle aleatoire generee a chaque activation de la maintenance, utilisee pour valider les cookies de bypass'
        AFTER mode_maintenance
      `);
      console.log('Colonne maintenance_key ajoutée.');
    } else {
      console.log('Colonne maintenance_key existe déjà.');
    }

    console.log('\n=== Migration terminée avec succès ===');

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
