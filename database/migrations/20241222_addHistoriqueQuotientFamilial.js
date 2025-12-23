/**
 * Migration: Historique Quotient Familial
 * Table pour stocker l'historique des QF de chaque utilisateur
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Historique Quotient Familial ===');

  // Verifier si la table existe deja
  const tables = await queryInterface.showAllTables();
  if (tables.includes('historique_quotient_familial')) {
    console.log('Table historique_quotient_familial existe deja, migration ignoree.');
    return;
  }

  // Creer la table historique_quotient_familial
  await queryInterface.createTable('historique_quotient_familial', {
    id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    utilisateur_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Utilisateur concerne'
    },
    quotient_familial: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: false,
      comment: 'Valeur du quotient familial'
    },
    date_debut: {
      type: sequelize.Sequelize.DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date de debut de validite'
    },
    date_fin: {
      type: sequelize.Sequelize.DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de fin (NULL = en cours)'
    },
    source: {
      type: sequelize.Sequelize.DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'manuel',
      comment: 'Source: manuel, caf, import, heritage'
    },
    justificatif: {
      type: sequelize.Sequelize.DataTypes.STRING(255),
      allowNull: true,
      comment: 'Chemin vers le fichier justificatif'
    },
    notes: {
      type: sequelize.Sequelize.DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes ou commentaires'
    },
    created_by: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Utilisateur ayant saisi cette entree'
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

  console.log('Table historique_quotient_familial creee');

  // Index
  await queryInterface.addIndex('historique_quotient_familial', ['utilisateur_id']);
  await queryInterface.addIndex('historique_quotient_familial', ['date_debut', 'date_fin']);
  // Note: MySQL ne supporte pas les index partiels (WHERE), utiliser un index standard
  await queryInterface.addIndex('historique_quotient_familial', ['utilisateur_id', 'date_fin'], {
    name: 'idx_hqf_user_current'
  });

  console.log('Index crees');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('historique_quotient_familial');
  console.log('Table historique_quotient_familial supprimee');
}

module.exports = { up, down };
