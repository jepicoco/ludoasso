// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sequelize = require('../../backend/config/sequelize');
const { DataTypes } = require('sequelize');

/**
 * Migration pour ajouter la colonne par_defaut à la table tarifs_cotisation
 */
async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔧 Vérification de la colonne par_defaut dans tarifs_cotisation...');

    // Vérifier si la colonne existe déjà
    const tableDescription = await queryInterface.describeTable('tarifs_cotisation');

    if (tableDescription.par_defaut) {
      console.log('✅ La colonne par_defaut existe déjà');
      return;
    }

    console.log('📋 Ajout de la colonne par_defaut...');

    await queryInterface.addColumn('tarifs_cotisation', 'par_defaut', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Tarif par défaut préchargé dans le formulaire de cotisation'
    });

    console.log('✅ Colonne par_defaut ajoutée avec succès');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = migrate;
