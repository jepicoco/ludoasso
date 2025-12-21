/**
 * Migration: Champs tarification sur Utilisateur
 * Ajoute les champs pour le quotient familial, commune de prise en charge, statuts sociaux, etc.
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Utilisateur Tarification ===');

  const columns = await queryInterface.describeTable('utilisateurs');

  // Quotient familial actuel (cache)
  if (!columns.quotient_familial) {
    await queryInterface.addColumn('utilisateurs', 'quotient_familial', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'QF actuel (mis a jour via historique)'
    });
    console.log('Colonne quotient_familial ajoutee');
  }

  // Heritage QF du parent
  if (!columns.qf_herite_parent) {
    await queryInterface.addColumn('utilisateurs', 'qf_herite_parent', {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'QF herite du parent (pour enfants)'
    });
    console.log('Colonne qf_herite_parent ajoutee');
  }

  // Surcharge manuelle du QF
  if (!columns.qf_surcharge_manuelle) {
    await queryInterface.addColumn('utilisateurs', 'qf_surcharge_manuelle', {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'QF saisi manuellement (ignore heritage)'
    });
    console.log('Colonne qf_surcharge_manuelle ajoutee');
  }

  // Commune de prise en charge (differente de la residence) - sans FK
  if (!columns.commune_prise_en_charge_id) {
    await queryInterface.addColumn('utilisateurs', 'commune_prise_en_charge_id', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Commune pour calcul reductions (si != residence)'
    });
    console.log('Colonne commune_prise_en_charge_id ajoutee');
  }

  // Commune de residence (lien direct) - sans FK
  if (!columns.commune_id) {
    await queryInterface.addColumn('utilisateurs', 'commune_id', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Commune de residence (deduite de code_postal/ville)'
    });
    console.log('Colonne commune_id ajoutee');
  }

  // Statuts sociaux (JSON array)
  if (!columns.statut_social) {
    await queryInterface.addColumn('utilisateurs', 'statut_social', {
      type: sequelize.Sequelize.DataTypes.JSON,
      allowNull: true,
      comment: 'Statuts sociaux: ["rsa", "aah", "etudiant", "chomeur", "retraite"]'
    });
    console.log('Colonne statut_social ajoutee');
  }

  // Carte handicap
  if (!columns.carte_handicap) {
    await queryInterface.addColumn('utilisateurs', 'carte_handicap', {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Possede une carte handicap/invalidite'
    });
    console.log('Colonne carte_handicap ajoutee');
  }

  // Date premiere adhesion (pour calcul anciennete)
  if (!columns.date_premiere_adhesion) {
    await queryInterface.addColumn('utilisateurs', 'date_premiere_adhesion', {
      type: sequelize.Sequelize.DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date de premiere adhesion (pour calcul fidelite)'
    });
    console.log('Colonne date_premiere_adhesion ajoutee');

    // Initialiser avec date_adhesion pour les utilisateurs existants
    await sequelize.query(`
      UPDATE utilisateurs
      SET date_premiere_adhesion = date_adhesion
      WHERE date_premiere_adhesion IS NULL AND date_adhesion IS NOT NULL
    `);
    console.log('date_premiere_adhesion initialisee avec date_adhesion');
  }

  // Mettre qf_herite_parent = true pour les enfants existants
  await sequelize.query(`
    UPDATE utilisateurs
    SET qf_herite_parent = true
    WHERE utilisateur_parent_id IS NOT NULL AND qf_surcharge_manuelle = false
  `);
  console.log('qf_herite_parent active pour les enfants existants');

  console.log('=== Migration Utilisateur Tarification terminee ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const columnsToRemove = [
    'quotient_familial',
    'qf_herite_parent',
    'qf_surcharge_manuelle',
    'commune_prise_en_charge_id',
    'commune_id',
    'statut_social',
    'carte_handicap',
    'date_premiere_adhesion'
  ];

  for (const col of columnsToRemove) {
    try {
      await queryInterface.removeColumn('utilisateurs', col);
      console.log(`Colonne ${col} supprimee`);
    } catch (e) {
      console.log(`Colonne ${col} n'existe pas ou deja supprimee`);
    }
  }
}

module.exports = { up, down };
