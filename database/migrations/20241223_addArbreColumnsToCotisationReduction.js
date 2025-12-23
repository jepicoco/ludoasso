/**
 * Migration: Add decision tree columns to cotisation_reductions
 * Adds operation_id, branche_code, branche_libelle for decision tree tracking
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Add arbre columns to cotisation_reductions ===');

  // Check if table exists
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('cotisation_reductions')) {
    console.log('Table cotisation_reductions n\'existe pas, migration ignoree');
    return;
  }

  // Check existing columns
  const tableDescription = await queryInterface.describeTable('cotisation_reductions');

  // Add operation_id if not exists
  if (!tableDescription.operation_id) {
    await queryInterface.addColumn('cotisation_reductions', 'operation_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Operation comptable associee (pour export)'
    });
    console.log('Colonne operation_id ajoutee');
  } else {
    console.log('Colonne operation_id existe deja');
  }

  // Add branche_code if not exists
  if (!tableDescription.branche_code) {
    await queryInterface.addColumn('cotisation_reductions', 'branche_code', {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Code de la branche dans l\'arbre de decision'
    });
    console.log('Colonne branche_code ajoutee');
  } else {
    console.log('Colonne branche_code existe deja');
  }

  // Add branche_libelle if not exists
  if (!tableDescription.branche_libelle) {
    await queryInterface.addColumn('cotisation_reductions', 'branche_libelle', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Libelle de la branche'
    });
    console.log('Colonne branche_libelle ajoutee');
  } else {
    console.log('Colonne branche_libelle existe deja');
  }

  // Modify type_source to allow more values (STRING instead of ENUM)
  if (tableDescription.type_source && tableDescription.type_source.type === 'ENUM') {
    try {
      await queryInterface.changeColumn('cotisation_reductions', 'type_source', {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Source de la reduction (COMMUNE, QF, AGE, TAG, etc.)'
      });
      console.log('Colonne type_source convertie en STRING(50)');
    } catch (e) {
      console.log('Conversion type_source ignoree:', e.message);
    }
  }

  console.log('Migration terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const tableDescription = await queryInterface.describeTable('cotisation_reductions');

  if (tableDescription.operation_id) {
    await queryInterface.removeColumn('cotisation_reductions', 'operation_id');
  }

  if (tableDescription.branche_code) {
    await queryInterface.removeColumn('cotisation_reductions', 'branche_code');
  }

  if (tableDescription.branche_libelle) {
    await queryInterface.removeColumn('cotisation_reductions', 'branche_libelle');
  }

  console.log('Rollback termine');
}

module.exports = { up, down };
