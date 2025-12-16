/**
 * Migration: Ajouter le champ couleur_texte aux modules_actifs
 * Permet de definir une couleur de texte personnalisee pour chaque module
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si la colonne existe deja
  const tableInfo = await queryInterface.describeTable('modules_actifs');

  if (!tableInfo.couleur_texte) {
    await queryInterface.addColumn('modules_actifs', 'couleur_texte', {
      type: require('sequelize').DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Couleur du texte (hex). Si null, calcule automatiquement'
    });
    console.log('Colonne couleur_texte ajoutee a modules_actifs');
  } else {
    console.log('Colonne couleur_texte existe deja');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const tableInfo = await queryInterface.describeTable('modules_actifs');

  if (tableInfo.couleur_texte) {
    await queryInterface.removeColumn('modules_actifs', 'couleur_texte');
    console.log('Colonne couleur_texte supprimee de modules_actifs');
  }
}

module.exports = { up, down };
