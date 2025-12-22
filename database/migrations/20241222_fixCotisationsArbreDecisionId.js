/**
 * Migration corrective: Ajouter arbre_decision_id a cotisations
 *
 * Cette colonne manquait dans la migration initiale.
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  const cotisationsCols = await queryInterface.describeTable('cotisations');

  if (!cotisationsCols.arbre_decision_id) {
    await queryInterface.addColumn('cotisations', 'arbre_decision_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    console.log('Colonne arbre_decision_id ajoutee a cotisations');

    // Ajouter la FK seulement si la table existe
    const tables = await queryInterface.showAllTables();
    const tableList = tables.map(t => typeof t === 'string' ? t : t.tableName || t.Tables_in_liberteko || Object.values(t)[0]);

    if (tableList.includes('arbres_decision_tarif')) {
      try {
        await queryInterface.addConstraint('cotisations', {
          fields: ['arbre_decision_id'],
          type: 'foreign key',
          name: 'fk_cotisations_arbre_decision',
          references: {
            table: 'arbres_decision_tarif',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('FK arbre_decision_id ajoutee');
      } catch (e) {
        console.log('FK deja existante ou erreur:', e.message);
      }
    }
  } else {
    console.log('Colonne arbre_decision_id existe deja');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const cotisationsCols = await queryInterface.describeTable('cotisations');

  if (cotisationsCols.arbre_decision_id) {
    try {
      await queryInterface.removeConstraint('cotisations', 'fk_cotisations_arbre_decision');
    } catch (e) {
      // Ignore si contrainte n'existe pas
    }
    await queryInterface.removeColumn('cotisations', 'arbre_decision_id');
    console.log('Colonne arbre_decision_id supprimee de cotisations');
  }
}

module.exports = { up, down };
