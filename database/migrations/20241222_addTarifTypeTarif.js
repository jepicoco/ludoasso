/**
 * Migration: Table de liaison TarifTypeTarif
 * Permet d'associer plusieurs types de tarifs a un TarifCotisation
 * avec des montants de base differents (ex: Adulte 360€, Enfant 240€)
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const { DataTypes } = sequelize.Sequelize;

  console.log('=== Migration TarifTypeTarif ===');

  // Verifier si la table existe deja
  const tables = await queryInterface.showAllTables();
  if (tables.includes('tarifs_types_tarifs')) {
    console.log('Table tarifs_types_tarifs existe deja, migration ignoree.');
    return;
  }

  // Verifier si les tables de dependance existent
  if (!tables.includes('types_tarifs')) {
    console.log('Table types_tarifs n\'existe pas - migration ignoree (sera creee par addTypeTarif)');
    return;
  }

  // Creer la table tarifs_types_tarifs
  await queryInterface.createTable('tarifs_types_tarifs', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tarif_cotisation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tarifs_cotisation',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Tarif de cotisation parent'
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
    montant_base: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Montant de base pour ce type (ex: 360€ pour adulte)'
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

  console.log('Table tarifs_types_tarifs creee');

  // Index unique pour eviter les doublons
  await queryInterface.addIndex('tarifs_types_tarifs',
    ['tarif_cotisation_id', 'type_tarif_id'],
    {
      unique: true,
      name: 'idx_tarif_type_unique'
    }
  );
  console.log('Index unique cree');

  // Index pour les recherches
  await queryInterface.addIndex('tarifs_types_tarifs', ['tarif_cotisation_id']);
  await queryInterface.addIndex('tarifs_types_tarifs', ['type_tarif_id']);

  // Migration des donnees existantes
  // Pour chaque TarifCotisation ayant un type_tarif_id, creer l'entree correspondante
  const [existingTarifs] = await sequelize.query(`
    SELECT id, montant_base, type_tarif_id
    FROM tarifs_cotisation
    WHERE type_tarif_id IS NOT NULL
  `);

  if (existingTarifs.length > 0) {
    for (const tarif of existingTarifs) {
      await sequelize.query(`
        INSERT INTO tarifs_types_tarifs
          (tarif_cotisation_id, type_tarif_id, montant_base, actif, created_at, updated_at)
        VALUES
          (?, ?, ?, true, NOW(), NOW())
        ON DUPLICATE KEY UPDATE montant_base = VALUES(montant_base)
      `, {
        replacements: [tarif.id, tarif.type_tarif_id, tarif.montant_base]
      });
    }
    console.log(`${existingTarifs.length} associations migrees depuis les tarifs existants`);
  }

  // Pour les tarifs sans type_tarif_id, creer une association avec le type STANDARD
  const [tarifsStandard] = await sequelize.query(`
    SELECT tc.id, tc.montant_base, tt.id as standard_id
    FROM tarifs_cotisation tc
    CROSS JOIN (SELECT id FROM types_tarifs WHERE code = 'STANDARD' LIMIT 1) tt
    WHERE tc.type_tarif_id IS NULL
  `);

  if (tarifsStandard.length > 0) {
    for (const tarif of tarifsStandard) {
      await sequelize.query(`
        INSERT INTO tarifs_types_tarifs
          (tarif_cotisation_id, type_tarif_id, montant_base, actif, created_at, updated_at)
        VALUES
          (?, ?, ?, true, NOW(), NOW())
        ON DUPLICATE KEY UPDATE montant_base = VALUES(montant_base)
      `, {
        replacements: [tarif.id, tarif.standard_id, tarif.montant_base]
      });
    }
    console.log(`${tarifsStandard.length} tarifs sans type lies au type STANDARD`);
  }

  console.log('Migration TarifTypeTarif terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer la table
  await queryInterface.dropTable('tarifs_types_tarifs');
  console.log('Table tarifs_types_tarifs supprimee');
}

module.exports = { up, down };
