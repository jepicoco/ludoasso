/**
 * Migration: Ajoute la table tablet_pairing_tokens
 * Pour le système d'appairage simplifié des tablettes de fréquentation
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Vérifier si la table existe déjà
  const tables = await queryInterface.showAllTables();
  if (tables.map(t => t.toLowerCase()).includes('tablet_pairing_tokens')) {
    console.log('    Table tablet_pairing_tokens existe deja, skip');
    return;
  }

  await queryInterface.createTable('tablet_pairing_tokens', {
    id: {
      type: require('sequelize').DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pairing_code: {
      type: require('sequelize').DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Code court d\'appairage (6 chiffres)'
    },
    api_key_encrypted: {
      type: require('sequelize').DataTypes.TEXT,
      allowNull: false,
      comment: 'Cle API en clair chiffree AES-256'
    },
    questionnaire_id: {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'questionnaires_frequentation',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    site_id: {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sites',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    api_key_id: {
      type: require('sequelize').DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'api_keys',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Reference a la cle API creee'
    },
    expires_at: {
      type: require('sequelize').DataTypes.DATE,
      allowNull: false,
      comment: 'Date d\'expiration (15 minutes apres creation)'
    },
    used_at: {
      type: require('sequelize').DataTypes.DATE,
      allowNull: true,
      comment: 'Date d\'utilisation (null si non utilise)'
    },
    created_at: {
      type: require('sequelize').DataTypes.DATE,
      defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: require('sequelize').DataTypes.DATE,
      defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP')
    }
  });

  // Index pour recherche rapide par code
  await queryInterface.addIndex('tablet_pairing_tokens', ['pairing_code'], {
    name: 'idx_pairing_code'
  });

  // Index pour nettoyage des tokens expires
  await queryInterface.addIndex('tablet_pairing_tokens', ['expires_at'], {
    name: 'idx_expires_at'
  });

  console.log('    Table tablet_pairing_tokens creee avec succes');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.dropTable('tablet_pairing_tokens');
  console.log('    Table tablet_pairing_tokens supprimee');
}

module.exports = { up, down };
