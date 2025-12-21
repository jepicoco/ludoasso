/**
 * Migration: Regles de Reduction
 * Regles configurables pour les reductions de cotisation
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Regles de Reduction ===');

  // Verifier si la table existe deja
  const tables = await queryInterface.showAllTables();
  if (tables.includes('regles_reduction')) {
    console.log('Table regles_reduction existe deja, migration ignoree.');
    return;
  }

  // Creer la table regles_reduction
  await queryInterface.createTable('regles_reduction', {
    id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: sequelize.Sequelize.DataTypes.STRING(50),
      allowNull: false,
      comment: 'Code unique de la regle'
    },
    libelle: {
      type: sequelize.Sequelize.DataTypes.STRING(100),
      allowNull: false,
      comment: 'Libelle affiche (ex: "Reduction commune Sciez")'
    },
    description: {
      type: sequelize.Sequelize.DataTypes.TEXT,
      allowNull: true
    },
    type_source: {
      type: sequelize.Sequelize.DataTypes.ENUM(
        'commune',           // Reduction par commune de residence ou prise en charge
        'quotient_familial', // Reduction selon tranche QF
        'statut_social',     // RSA, AAH, chomeur, etudiant, retraite
        'multi_enfants',     // A partir du 3e enfant
        'fidelite',          // Anciennete d'adhesion
        'partenariat',       // Association partenaire, CE
        'handicap',          // Carte handicap
        'age',               // Condition d'age specifique
        'manuel'             // Reduction manuelle
      ),
      allowNull: false,
      comment: 'Source/type de la reduction'
    },
    type_calcul: {
      type: sequelize.Sequelize.DataTypes.ENUM('fixe', 'pourcentage'),
      allowNull: false,
      defaultValue: 'fixe',
      comment: 'Montant fixe ou pourcentage de reduction'
    },
    valeur: {
      type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant en euros OU pourcentage (0-100)'
    },
    condition_json: {
      type: sequelize.Sequelize.DataTypes.JSON,
      allowNull: true,
      comment: 'Conditions specifiques selon type_source (commune_ids, statuts, rang_enfant_min, etc.)'
    },
    ordre_application: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      comment: 'Ordre dans le cumul des reductions (plus petit = applique en premier)'
    },
    cumulable: {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Peut se cumuler avec d\'autres reductions'
    },
    permet_avoir: {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si true, reduction > montant peut generer un avoir'
    },
    section_analytique_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Section analytique pour cette reduction'
    },
    regroupement_analytique_id: {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'OU regroupement analytique'
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

  console.log('Table regles_reduction creee');

  // Index
  await queryInterface.addIndex('regles_reduction', ['structure_id']);
  await queryInterface.addIndex('regles_reduction', ['type_source']);
  await queryInterface.addIndex('regles_reduction', ['ordre_application']);
  await queryInterface.addIndex('regles_reduction', ['code', 'structure_id'], { unique: true });

  console.log('Index crees');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('regles_reduction');
  console.log('Table regles_reduction supprimee');
}

module.exports = { up, down };
