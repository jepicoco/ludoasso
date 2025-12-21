/**
 * Migration: Configuration Quotient Familial
 * Tables pour les configurations et tranches de quotient familial
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Configuration Quotient Familial ===');

  // Verifier si la table existe deja
  const tables = await queryInterface.showAllTables();

  // Table configurations_quotient_familial
  if (!tables.includes('configurations_quotient_familial')) {
    await queryInterface.createTable('configurations_quotient_familial', {
      id: {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: sequelize.Sequelize.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Code unique (ex: BAREME_CAF_2024)'
      },
      libelle: {
        type: sequelize.Sequelize.DataTypes.STRING(100),
        allowNull: false,
        comment: 'Libelle affiche (ex: "Bareme CAF 2024")'
      },
      description: {
        type: sequelize.Sequelize.DataTypes.TEXT,
        allowNull: true
      },
      actif: {
        type: sequelize.Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      par_defaut: {
        type: sequelize.Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Configuration par defaut pour les nouvelles cotisations'
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

    console.log('Table configurations_quotient_familial creee');
    await queryInterface.addIndex('configurations_quotient_familial', ['structure_id']);
  } else {
    console.log('Table configurations_quotient_familial existe deja');
  }

  // Table tranches_quotient_familial
  if (!tables.includes('tranches_quotient_familial')) {
    await queryInterface.createTable('tranches_quotient_familial', {
      id: {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      configuration_qf_id: {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'configurations_quotient_familial',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Configuration parente'
      },
      libelle: {
        type: sequelize.Sequelize.DataTypes.STRING(100),
        allowNull: false,
        comment: 'Libelle affiche (ex: "QF 0-400")'
      },
      borne_min: {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Borne inferieure (incluse)'
      },
      borne_max: {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        allowNull: true,
        comment: 'Borne superieure (exclue), NULL = infini'
      },
      type_calcul: {
        type: sequelize.Sequelize.DataTypes.ENUM('fixe', 'pourcentage'),
        allowNull: false,
        defaultValue: 'fixe',
        comment: 'Type de valeur: montant fixe ou pourcentage du tarif de base'
      },
      valeur: {
        type: sequelize.Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Montant fixe en euros OU pourcentage (0-100)'
      },
      ordre: {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordre d\'affichage'
      },
      actif: {
        type: sequelize.Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    console.log('Table tranches_quotient_familial creee');
    await queryInterface.addIndex('tranches_quotient_familial', ['configuration_qf_id']);
    await queryInterface.addIndex('tranches_quotient_familial', ['borne_min', 'borne_max']);
  } else {
    console.log('Table tranches_quotient_familial existe deja');
  }

  // Inserer une configuration par defaut avec les tranches de l'exemple
  const [configs] = await sequelize.query(`
    SELECT id FROM configurations_quotient_familial WHERE code = 'BAREME_DEFAUT'
  `);

  if (configs.length === 0) {
    await sequelize.query(`
      INSERT INTO configurations_quotient_familial (code, libelle, description, actif, par_defaut, created_at, updated_at)
      VALUES ('BAREME_DEFAUT', 'Bareme par defaut', 'Tranches de quotient familial standard', true, true, NOW(), NOW())
    `);

    const [[configResult]] = await sequelize.query(`
      SELECT id FROM configurations_quotient_familial WHERE code = 'BAREME_DEFAUT'
    `);
    const configId = configResult.id;

    // Inserer les tranches selon l'exemple utilisateur:
    // Vide = tarif maximum : 20€
    // 0-400 : 5€
    // 401-620 : 8€
    // 621-1200 : 12€
    // 1201-1800 : 18€
    // >= 1801 : 20€
    await sequelize.query(`
      INSERT INTO tranches_quotient_familial (configuration_qf_id, libelle, borne_min, borne_max, type_calcul, valeur, ordre, actif, created_at, updated_at)
      VALUES
        (${configId}, 'QF 0-400', 0, 400, 'fixe', 5.00, 1, true, NOW(), NOW()),
        (${configId}, 'QF 401-620', 401, 620, 'fixe', 8.00, 2, true, NOW(), NOW()),
        (${configId}, 'QF 621-1200', 621, 1200, 'fixe', 12.00, 3, true, NOW(), NOW()),
        (${configId}, 'QF 1201-1800', 1201, 1800, 'fixe', 18.00, 4, true, NOW(), NOW()),
        (${configId}, 'QF >= 1801', 1801, NULL, 'fixe', 20.00, 5, true, NOW(), NOW())
    `);

    console.log('Configuration QF par defaut avec tranches inseree');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.dropTable('tranches_quotient_familial');
  console.log('Table tranches_quotient_familial supprimee');

  await queryInterface.dropTable('configurations_quotient_familial');
  console.log('Table configurations_quotient_familial supprimee');
}

module.exports = { up, down };
