/**
 * Migration: Table TrancheQFValeur
 * Permet de definir des valeurs QF differentes par type de tarif
 * Ex: Tranche QF 0-400 -> Adulte: 90€, Enfant: 60€
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const { DataTypes } = sequelize.Sequelize;

  console.log('=== Migration TrancheQFValeur ===');

  // Verifier si la table existe deja
  const tables = await queryInterface.showAllTables();
  if (tables.includes('tranches_qf_valeurs')) {
    console.log('Table tranches_qf_valeurs existe deja, migration ignoree.');
    return;
  }

  // Verifier les dependances
  if (!tables.includes('tranches_quotient_familial')) {
    console.log('Table tranches_quotient_familial n\'existe pas - migration ignoree');
    return;
  }
  if (!tables.includes('types_tarifs')) {
    console.log('Table types_tarifs n\'existe pas - migration ignoree');
    return;
  }

  // Creer la table tranches_qf_valeurs
  await queryInterface.createTable('tranches_qf_valeurs', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tranche_qf_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tranches_quotient_familial',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Tranche de QF parente'
    },
    type_tarif_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'types_tarifs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Type de tarif (ADULTE, ENFANT, etc.)'
    },
    type_calcul: {
      type: DataTypes.ENUM('fixe', 'pourcentage'),
      allowNull: false,
      defaultValue: 'fixe',
      comment: 'Type de valeur: montant fixe ou pourcentage du tarif de base'
    },
    valeur: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant fixe en euros OU pourcentage (0-100)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  console.log('Table tranches_qf_valeurs creee');

  // Index unique pour eviter les doublons
  await queryInterface.addIndex('tranches_qf_valeurs',
    ['tranche_qf_id', 'type_tarif_id'],
    {
      unique: true,
      name: 'idx_tranche_type_unique'
    }
  );
  console.log('Index unique cree');

  // Index pour les recherches
  await queryInterface.addIndex('tranches_qf_valeurs', ['tranche_qf_id']);
  await queryInterface.addIndex('tranches_qf_valeurs', ['type_tarif_id']);

  // Migration des donnees existantes
  // Pour chaque tranche QF existante avec une valeur, creer des entrees pour tous les types de tarifs
  const [tranches] = await sequelize.query(`
    SELECT id, type_calcul, valeur
    FROM tranches_quotient_familial
    WHERE actif = true AND valeur IS NOT NULL AND valeur > 0
  `);

  const [typesTarifs] = await sequelize.query(`
    SELECT id FROM types_tarifs WHERE actif = true
  `);

  if (tranches.length > 0 && typesTarifs.length > 0) {
    console.log(`Migration de ${tranches.length} tranches vers ${typesTarifs.length} types de tarifs...`);

    for (const tranche of tranches) {
      for (const typeTarif of typesTarifs) {
        await sequelize.query(`
          INSERT INTO tranches_qf_valeurs
            (tranche_qf_id, type_tarif_id, type_calcul, valeur, actif, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, true, NOW(), NOW())
          ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)
        `, {
          replacements: [tranche.id, typeTarif.id, tranche.type_calcul, tranche.valeur]
        });
      }
    }

    console.log(`${tranches.length * typesTarifs.length} valeurs par type creees`);
  }

  console.log('Migration TrancheQFValeur terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer la table
  await queryInterface.dropTable('tranches_qf_valeurs');
  console.log('Table tranches_qf_valeurs supprimee');
}

module.exports = { up, down };
