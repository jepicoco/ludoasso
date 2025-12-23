/**
 * Migration: Add organisation barcode groups and config tables
 *
 * organisation_barcode_groups: Groupes de codes-barres par organisation (ex: ZIK1, FILF)
 * organisation_barcode_config: Configuration du type de gestion par module
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Add organisation barcode config tables ===');

  // Check existing tables
  const tables = await queryInterface.showAllTables();

  // 1. Table organisation_barcode_groups
  if (!tables.includes('organisation_barcode_groups')) {
    await queryInterface.createTable('organisation_barcode_groups', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'organisations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Code du groupe (ex: ZIK1, FILF, JEUX_AGGLO)'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    });

    // Index unique sur organisation_id + code
    await queryInterface.addIndex('organisation_barcode_groups', ['organisation_id', 'code'], {
      unique: true,
      name: 'idx_org_barcode_groups_unique'
    });

    console.log('Table organisation_barcode_groups creee');
  } else {
    console.log('Table organisation_barcode_groups existe deja');
  }

  // 2. Table organisation_barcode_config
  if (!tables.includes('organisation_barcode_config')) {
    await queryInterface.createTable('organisation_barcode_config', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'organisations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      module: {
        type: DataTypes.ENUM('utilisateur', 'jeu', 'livre', 'film', 'disque'),
        allowNull: false,
        comment: 'Module concerne'
      },
      type_gestion: {
        type: DataTypes.ENUM('organisation', 'structure', 'groupe'),
        allowNull: false,
        defaultValue: 'organisation',
        comment: 'Type de gestion des codes-barres'
      },
      groupe_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'organisation_barcode_groups',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Groupe associe (si type_gestion = groupe)'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    });

    // Index unique sur organisation_id + module
    await queryInterface.addIndex('organisation_barcode_config', ['organisation_id', 'module'], {
      unique: true,
      name: 'idx_org_barcode_config_unique'
    });

    console.log('Table organisation_barcode_config creee');
  } else {
    console.log('Table organisation_barcode_config existe deja');
  }

  console.log('Migration terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const tables = await queryInterface.showAllTables();

  // Supprimer dans l'ordre inverse (config d'abord car FK vers groups)
  if (tables.includes('organisation_barcode_config')) {
    await queryInterface.dropTable('organisation_barcode_config');
    console.log('Table organisation_barcode_config supprimee');
  }

  if (tables.includes('organisation_barcode_groups')) {
    await queryInterface.dropTable('organisation_barcode_groups');
    console.log('Table organisation_barcode_groups supprimee');
  }

  console.log('Rollback termine');
}

module.exports = { up, down };
