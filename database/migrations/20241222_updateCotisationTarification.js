/**
 * Migration: Mise à jour Cotisation pour tarification avancée
 * Ajoute les champs de détail du calcul de tarif
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Cotisation Tarification ===');

  const columns = await queryInterface.describeTable('cotisations');

  // Tarif de base avant réductions
  if (!columns.tarif_base) {
    await queryInterface.addColumn('cotisations', 'tarif_base', {
      type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tarif de base avant réductions'
    });
    console.log('Colonne tarif_base ajoutée');
  }

  // Total des réductions
  if (!columns.total_reductions) {
    await queryInterface.addColumn('cotisations', 'total_reductions', {
      type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total des réductions appliquées'
    });
    console.log('Colonne total_reductions ajoutée');
  }

  // Lien vers historique QF utilisé (sans FK si table n'existe pas)
  if (!columns.historique_qf_id) {
    await queryInterface.addColumn('cotisations', 'historique_qf_id', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Historique QF utilisé pour le calcul'
    });
    console.log('Colonne historique_qf_id ajoutée');
  }

  // QF snapshot (valeur au moment de la cotisation)
  if (!columns.quotient_familial_snapshot) {
    await queryInterface.addColumn('cotisations', 'quotient_familial_snapshot', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Valeur du QF au moment de la cotisation'
    });
    console.log('Colonne quotient_familial_snapshot ajoutée');
  }

  // Lien vers tranche QF utilisée (sans FK si table n'existe pas)
  if (!columns.tranche_qf_id) {
    await queryInterface.addColumn('cotisations', 'tranche_qf_id', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tranche QF appliquée'
    });
    console.log('Colonne tranche_qf_id ajoutée');
  }

  // Commune prise en charge au moment de la cotisation (sans FK)
  if (!columns.commune_id_snapshot) {
    await queryInterface.addColumn('cotisations', 'commune_id_snapshot', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Commune de prise en charge au moment de la cotisation'
    });
    console.log('Colonne commune_id_snapshot ajoutée');
  }

  // Âge au moment de la cotisation
  if (!columns.age_snapshot) {
    await queryInterface.addColumn('cotisations', 'age_snapshot', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
      comment: 'Âge de l\'utilisateur au moment de la cotisation'
    });
    console.log('Colonne age_snapshot ajoutée');
  }

  // JSON détail du calcul (pour audit et debug)
  if (!columns.detail_calcul_json) {
    await queryInterface.addColumn('cotisations', 'detail_calcul_json', {
      type: sequelize.Sequelize.DataTypes.JSON,
      allowNull: true,
      comment: 'Détail complet du calcul pour audit'
    });
    console.log('Colonne detail_calcul_json ajoutée');
  }

  // Initialiser tarif_base avec montant_base pour les cotisations existantes
  await sequelize.query(`
    UPDATE cotisations
    SET tarif_base = montant_base
    WHERE tarif_base IS NULL
  `);
  console.log('tarif_base initialisé avec montant_base pour cotisations existantes');

  console.log('=== Migration Cotisation Tarification terminée ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const columnsToRemove = [
    'tarif_base',
    'total_reductions',
    'historique_qf_id',
    'quotient_familial_snapshot',
    'tranche_qf_id',
    'commune_id_snapshot',
    'age_snapshot',
    'detail_calcul_json'
  ];

  for (const col of columnsToRemove) {
    try {
      await queryInterface.removeColumn('cotisations', col);
      console.log(`Colonne ${col} supprimée`);
    } catch (e) {
      console.log(`Colonne ${col} n'existe pas ou déjà supprimée`);
    }
  }
}

module.exports = { up, down };
