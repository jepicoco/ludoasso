/**
 * Migration: Connecteurs Email/SMS par Structure
 *
 * Ajoute la possibilite d'assigner des connecteurs email/SMS a chaque structure
 * avec une hierarchie de resolution:
 *   1. Override par evenement (ex: EMPRUNT_RETARD)
 *   2. Override par categorie (ex: emprunt, cotisation)
 *   3. Connecteur par defaut de la structure
 *   4. Connecteur par defaut du systeme
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration: Connecteurs Structure ===');

  // 1. Ajouter colonnes connecteurs par defaut sur structures
  console.log('Ajout colonnes configuration_email_id et configuration_sms_id sur structures...');

  const structureColumns = await queryInterface.describeTable('structures');

  if (!structureColumns.configuration_email_id) {
    await queryInterface.addColumn('structures', 'configuration_email_id', {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'configurations_email',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    console.log('  - configuration_email_id ajoutee');
  } else {
    console.log('  - configuration_email_id existe deja');
  }

  if (!structureColumns.configuration_sms_id) {
    await queryInterface.addColumn('structures', 'configuration_sms_id', {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'configurations_sms',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    console.log('  - configuration_sms_id ajoutee');
  } else {
    console.log('  - configuration_sms_id existe deja');
  }

  // 2. Creer table structure_connecteurs_categories
  console.log('Creation table structure_connecteurs_categories...');

  const tables = await queryInterface.showAllTables();

  if (!tables.includes('structure_connecteurs_categories')) {
    await queryInterface.createTable('structure_connecteurs_categories', {
      id: {
        type: require('sequelize').DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      structure_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      categorie: {
        type: require('sequelize').DataTypes.ENUM('adherent', 'emprunt', 'cotisation', 'systeme', 'reservation'),
        allowNull: false,
        comment: 'Categorie d\'evenements'
      },
      configuration_email_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'configurations_email',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      configuration_sms_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'configurations_sms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Index unique sur structure_id + categorie
    await queryInterface.addIndex('structure_connecteurs_categories',
      ['structure_id', 'categorie'],
      { unique: true, name: 'idx_structure_categorie_unique' }
    );

    console.log('  - Table structure_connecteurs_categories creee');
  } else {
    console.log('  - Table structure_connecteurs_categories existe deja');
  }

  // 3. Creer table structure_connecteurs_evenements
  console.log('Creation table structure_connecteurs_evenements...');

  if (!tables.includes('structure_connecteurs_evenements')) {
    await queryInterface.createTable('structure_connecteurs_evenements', {
      id: {
        type: require('sequelize').DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      structure_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_trigger_code: {
        type: require('sequelize').DataTypes.STRING(50),
        allowNull: false,
        comment: 'Code de l\'evenement (ex: EMPRUNT_RETARD)'
      },
      configuration_email_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'configurations_email',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      configuration_sms_id: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'configurations_sms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Index unique sur structure_id + event_trigger_code
    await queryInterface.addIndex('structure_connecteurs_evenements',
      ['structure_id', 'event_trigger_code'],
      { unique: true, name: 'idx_structure_event_unique' }
    );

    // Index sur event_trigger_code pour recherche rapide
    await queryInterface.addIndex('structure_connecteurs_evenements',
      ['event_trigger_code'],
      { name: 'idx_event_trigger_code' }
    );

    console.log('  - Table structure_connecteurs_evenements creee');
  } else {
    console.log('  - Table structure_connecteurs_evenements existe deja');
  }

  console.log('=== Migration terminee ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback: Connecteurs Structure ===');

  // Supprimer tables
  await queryInterface.dropTable('structure_connecteurs_evenements').catch(() => {});
  await queryInterface.dropTable('structure_connecteurs_categories').catch(() => {});

  // Supprimer colonnes sur structures
  const structureColumns = await queryInterface.describeTable('structures');
  if (structureColumns.configuration_email_id) {
    await queryInterface.removeColumn('structures', 'configuration_email_id');
  }
  if (structureColumns.configuration_sms_id) {
    await queryInterface.removeColumn('structures', 'configuration_sms_id');
  }

  console.log('=== Rollback termine ===');
}

module.exports = { up, down };
