/**
 * Script pour exécuter la migration: ajout de la colonne adhesion_association
 */
require('dotenv').config();
const { sequelize } = require('./backend/models');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Connexion à la base de données...');
        await sequelize.authenticate();
        console.log('✓ Connecté');

        const migrationSQL = `
ALTER TABLE adherents
ADD COLUMN adhesion_association TINYINT(1) NOT NULL DEFAULT 0
COMMENT 'Adhérent est-il membre de l\\'association (pour réduction cotisation)'
AFTER notes;
        `;

        console.log('\nExécution de la migration...');
        console.log('SQL:', migrationSQL.trim());

        await sequelize.query(migrationSQL);

        console.log('\n✓ Migration exécutée avec succès!');
        console.log('La colonne adhesion_association a été ajoutée à la table adherents');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error.message);

        if (error.original && error.original.errno === 1060) {
            console.log('\n⚠️  La colonne existe déjà. Migration déjà appliquée.');
            process.exit(0);
        }

        process.exit(1);
    }
}

runMigration();
