/**
 * Migration: Types de Tarifs
 * Categories de tarifs avec conditions d'age (adulte, enfant, senior, etc.)
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Types Tarifs ===');

  // Verifier si la table existe deja
  const tables = await queryInterface.showAllTables();
  if (tables.includes('types_tarifs')) {
    console.log('Table types_tarifs existe deja, migration ignoree.');
    return;
  }

  // Creer la table types_tarifs
  await queryInterface.createTable('types_tarifs', {
    id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: sequelize.Sequelize.DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Code unique (ADULTE, ENFANT, SENIOR)'
    },
    libelle: {
      type: sequelize.Sequelize.DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche'
    },
    description: {
      type: sequelize.Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    condition_age_operateur: {
      type: sequelize.Sequelize.DataTypes.ENUM('<', '<=', '>', '>=', 'entre', 'aucune'),
      allowNull: false,
      defaultValue: 'aucune',
      comment: 'Operateur de comparaison pour l\'age'
    },
    condition_age_min: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Age minimum (pour operateur "entre")'
    },
    condition_age_max: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Age maximum ou seuil pour operateurs simples'
    },
    priorite: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      comment: 'Ordre de verification (plus petit = verifie en premier)'
    },
    actif: {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    structure_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Structure proprietaire (null = global)'
    },
    created_at: {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  console.log('Table types_tarifs creee');

  // Index
  await queryInterface.addIndex('types_tarifs', ['structure_id']);
  await queryInterface.addIndex('types_tarifs', ['priorite']);

  // Inserer les types par defaut
  await sequelize.query(`
    INSERT INTO types_tarifs (code, libelle, description, condition_age_operateur, condition_age_max, priorite, actif, created_at, updated_at)
    VALUES
      ('ENFANT', 'Enfant', 'Tarif pour les moins de 16 ans', '<', 16, 10, true, NOW(), NOW()),
      ('ADULTE', 'Adulte', 'Tarif standard pour les 16-69 ans', 'entre', NULL, 20, true, NOW(), NOW()),
      ('SENIOR', 'Senior', 'Tarif pour les 70 ans et plus', '>=', 70, 30, true, NOW(), NOW()),
      ('STANDARD', 'Standard', 'Tarif sans condition d\\'age', 'aucune', NULL, 100, true, NOW(), NOW())
  `);

  // Mettre a jour ADULTE avec les deux bornes
  await sequelize.query(`
    UPDATE types_tarifs SET condition_age_min = 16, condition_age_max = 69 WHERE code = 'ADULTE'
  `);

  console.log('Types de tarifs par defaut inseres');

  // Ajouter colonne type_tarif_id sur tarifs_cotisation
  const columns = await queryInterface.describeTable('tarifs_cotisation');
  if (!columns.type_tarif_id) {
    await queryInterface.addColumn('tarifs_cotisation', 'type_tarif_id', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'types_tarifs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Type de tarif (adulte, enfant, etc.)'
    });
    console.log('Colonne type_tarif_id ajoutee a tarifs_cotisation');

    // Lier les tarifs existants au type STANDARD
    await sequelize.query(`
      UPDATE tarifs_cotisation tc
      SET type_tarif_id = (SELECT id FROM types_tarifs WHERE code = 'STANDARD')
      WHERE tc.type_tarif_id IS NULL
    `);
    console.log('Tarifs existants lies au type STANDARD');
  }

  // Ajouter colonne type_tarif_id sur cotisations
  const cotisationColumns = await queryInterface.describeTable('cotisations');
  if (!cotisationColumns.type_tarif_id) {
    await queryInterface.addColumn('cotisations', 'type_tarif_id', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'types_tarifs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Type de tarif applique lors de la cotisation'
    });
    console.log('Colonne type_tarif_id ajoutee a cotisations');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer colonnes ajoutees
  try {
    await queryInterface.removeColumn('cotisations', 'type_tarif_id');
  } catch (e) {}

  try {
    await queryInterface.removeColumn('tarifs_cotisation', 'type_tarif_id');
  } catch (e) {}

  // Supprimer la table
  await queryInterface.dropTable('types_tarifs');
  console.log('Table types_tarifs supprimee');
}

module.exports = { up, down };
