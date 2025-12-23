/**
 * Migration: Add decision tree fields to cotisations table
 * Links cotisations to the decision tree that was used for calculation
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier si les colonnes existent deja
  const tableDescription = await queryInterface.describeTable('cotisations');

  if (!tableDescription.arbre_decision_id) {
    await queryInterface.addColumn('cotisations', 'arbre_decision_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'arbres_decision_tarif',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID de l\'arbre de decision utilise pour le calcul'
    });
    console.log('Colonne arbre_decision_id ajoutee');
  }

  if (!tableDescription.arbre_version) {
    await queryInterface.addColumn('cotisations', 'arbre_version', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Version de l\'arbre de decision au moment du calcul'
    });
    console.log('Colonne arbre_version ajoutee');
  }

  if (!tableDescription.chemin_arbre_json) {
    await queryInterface.addColumn('cotisations', 'chemin_arbre_json', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Chemin suivi dans l\'arbre de decision (pour audit)'
    });
    console.log('Colonne chemin_arbre_json ajoutee');
  }

  // Ajouter un index sur arbre_decision_id pour les performances
  try {
    await queryInterface.addIndex('cotisations', ['arbre_decision_id'], {
      name: 'idx_cotisations_arbre_decision'
    });
    console.log('Index idx_cotisations_arbre_decision cree');
  } catch (e) {
    if (!e.message.includes('Duplicate')) {
      throw e;
    }
  }

  console.log('Migration addArbreDecisionToCotisation terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await queryInterface.removeIndex('cotisations', 'idx_cotisations_arbre_decision');
  } catch (e) {
    // Index n'existe peut-etre pas
  }

  await queryInterface.removeColumn('cotisations', 'chemin_arbre_json');
  await queryInterface.removeColumn('cotisations', 'arbre_version');
  await queryInterface.removeColumn('cotisations', 'arbre_decision_id');

  console.log('Rollback addArbreDecisionToCotisation termine');
}

module.exports = { up, down };
