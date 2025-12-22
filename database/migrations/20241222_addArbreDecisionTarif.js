/**
 * Migration: Arbre de Decision Tarifaire
 *
 * Ajoute les tables pour le systeme d'arbre de decision visuel
 * permettant de configurer les reductions de cotisations.
 */

const { sequelize } = require('../../backend/models');
const { DataTypes } = require('sequelize');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableList = tables.map(t => typeof t === 'string' ? t : t.tableName || t.Tables_in_liberteko || Object.values(t)[0]);

  // ============================================================
  // Table 1: types_condition_tarif
  // Types de conditions disponibles (reference)
  // ============================================================
  if (!tableList.includes('types_condition_tarif')) {
    await queryInterface.createTable('types_condition_tarif', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      libelle: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      icone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      couleur: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      config_schema: {
        type: DataTypes.JSON,
        allowNull: true
      },
      ordre_affichage: {
        type: DataTypes.INTEGER,
        defaultValue: 100
      },
      actif: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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

    // Seed initial types
    await queryInterface.bulkInsert('types_condition_tarif', [
      {
        code: 'COMMUNE',
        libelle: 'Commune',
        description: 'Reduction basee sur la commune de residence',
        icone: 'bi-geo-alt',
        couleur: '#007bff',
        config_schema: JSON.stringify({
          type: 'commune',
          fields: ['communaute_id', 'communes_list']
        }),
        ordre_affichage: 10,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'QF',
        libelle: 'Quotient Familial',
        description: 'Reduction basee sur le quotient familial',
        icone: 'bi-graph-up',
        couleur: '#17a2b8',
        config_schema: JSON.stringify({
          type: 'range',
          fields: ['borne_min', 'borne_max']
        }),
        ordre_affichage: 20,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'AGE',
        libelle: 'Age',
        description: 'Reduction basee sur l\'age de l\'usager',
        icone: 'bi-calendar-event',
        couleur: '#6c757d',
        config_schema: JSON.stringify({
          type: 'range',
          fields: ['age_min', 'age_max'],
          operators: ['<', '<=', '>', '>=', 'entre']
        }),
        ordre_affichage: 30,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'FIDELITE',
        libelle: 'Fidelite',
        description: 'Reduction basee sur l\'anciennete de l\'usager',
        icone: 'bi-award',
        couleur: '#ffc107',
        config_schema: JSON.stringify({
          type: 'range',
          fields: ['annees_min', 'annees_max']
        }),
        ordre_affichage: 40,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'MULTI_INSCRIPTIONS',
        libelle: 'Multi-inscriptions',
        description: 'Reduction pour les familles avec plusieurs inscrits',
        icone: 'bi-people-fill',
        couleur: '#28a745',
        config_schema: JSON.stringify({
          type: 'count',
          fields: ['nb_inscrits_min', 'nb_inscrits_max']
        }),
        ordre_affichage: 50,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'STATUT_SOCIAL',
        libelle: 'Statut social',
        description: 'Reduction basee sur le statut social (RSA, chomage, etc.)',
        icone: 'bi-person-badge',
        couleur: '#dc3545',
        config_schema: JSON.stringify({
          type: 'enum',
          fields: ['statuts'],
          values: ['rsa', 'chomage', 'etudiant', 'retraite', 'handicap', 'autre']
        }),
        ordre_affichage: 60,
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('Table types_condition_tarif creee avec donnees initiales');
  }

  // ============================================================
  // Table 2: operations_comptables_reduction
  // Operations comptables specifiques aux types de reduction
  // ============================================================
  if (!tableList.includes('operations_comptables_reduction')) {
    await queryInterface.createTable('operations_comptables_reduction', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      libelle: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      compte_comptable: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      journal_code: {
        type: DataTypes.STRING(10),
        defaultValue: 'VT'
      },
      section_analytique_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'sections_analytiques',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      structure_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      actif: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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

    // Seed initial operations
    await queryInterface.bulkInsert('operations_comptables_reduction', [
      {
        code: 'REDUC_COMMUNE',
        libelle: 'Reduction commune/agglo',
        description: 'Reduction accordee aux habitants de la commune ou communaute',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'REDUC_QF',
        libelle: 'Reduction quotient familial',
        description: 'Reduction basee sur le quotient familial CAF',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'REDUC_AGE_ENFANT',
        libelle: 'Reduction enfant',
        description: 'Reduction accordee aux moins de 18 ans',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'REDUC_AGE_SENIOR',
        libelle: 'Reduction senior',
        description: 'Reduction accordee aux plus de 65 ans',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'REDUC_FIDELITE',
        libelle: 'Reduction fidelite',
        description: 'Reduction accordee selon l\'anciennete',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'REDUC_MULTI_INSCR',
        libelle: 'Reduction multi-inscriptions',
        description: 'Reduction pour familles avec plusieurs inscrits',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'REDUC_STATUT_SOCIAL',
        libelle: 'Reduction statut social',
        description: 'Reduction accordee selon le statut social',
        compte_comptable: '7065',
        journal_code: 'VT',
        actif: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('Table operations_comptables_reduction creee avec donnees initiales');
  }

  // ============================================================
  // Table 3: arbres_decision_tarif
  // Un arbre par tarif de cotisation
  // ============================================================
  if (!tableList.includes('arbres_decision_tarif')) {
    await queryInterface.createTable('arbres_decision_tarif', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      tarif_cotisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'tarifs_cotisation',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mode_affichage: {
        type: DataTypes.ENUM('minimum', 'maximum'),
        defaultValue: 'minimum'
      },
      arbre_json: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: { version: 1, noeuds: [] }
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      verrouille: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      date_verrouillage: {
        type: DataTypes.DATE,
        allowNull: true
      },
      structure_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'structures',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    console.log('Table arbres_decision_tarif creee');
  }

  // ============================================================
  // Table 4: cotisations_reductions
  // Trace des reductions appliquees sur chaque cotisation
  // ============================================================
  if (!tableList.includes('cotisations_reductions')) {
    await queryInterface.createTable('cotisations_reductions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      cotisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'cotisations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      operation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'operations_comptables_reduction',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type_source: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      branche_code: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      branche_libelle: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      montant_reduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      type_calcul: {
        type: DataTypes.ENUM('fixe', 'pourcentage'),
        defaultValue: 'fixe'
      },
      valeur_calcul: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    });

    // Index pour les exports comptables
    await queryInterface.addIndex('cotisations_reductions', ['operation_id', 'type_source'], {
      name: 'idx_cotisations_reductions_operation'
    });

    console.log('Table cotisations_reductions creee');
  }

  // ============================================================
  // Modification table cotisations
  // Ajouter colonnes pour tracer l'arbre utilise
  // ============================================================
  const cotisationsCols = await queryInterface.describeTable('cotisations');

  if (!cotisationsCols.arbre_version) {
    await queryInterface.addColumn('cotisations', 'arbre_version', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    console.log('Colonne arbre_version ajoutee a cotisations');
  }

  if (!cotisationsCols.chemin_arbre_json) {
    await queryInterface.addColumn('cotisations', 'chemin_arbre_json', {
      type: DataTypes.JSON,
      allowNull: true
    });
    console.log('Colonne chemin_arbre_json ajoutee a cotisations');
  }

  if (!cotisationsCols.arbre_decision_id) {
    await queryInterface.addColumn('cotisations', 'arbre_decision_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'arbres_decision_tarif',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    console.log('Colonne arbre_decision_id ajoutee a cotisations');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableList = tables.map(t => typeof t === 'string' ? t : t.tableName || t.Tables_in_liberteko || Object.values(t)[0]);

  // Remove columns from cotisations
  const cotisationsCols = await queryInterface.describeTable('cotisations');
  if (cotisationsCols.arbre_decision_id) {
    await queryInterface.removeColumn('cotisations', 'arbre_decision_id');
  }
  if (cotisationsCols.arbre_version) {
    await queryInterface.removeColumn('cotisations', 'arbre_version');
  }
  if (cotisationsCols.chemin_arbre_json) {
    await queryInterface.removeColumn('cotisations', 'chemin_arbre_json');
  }

  // Drop tables in reverse order
  if (tableList.includes('cotisations_reductions')) {
    await queryInterface.dropTable('cotisations_reductions');
  }
  if (tableList.includes('arbres_decision_tarif')) {
    await queryInterface.dropTable('arbres_decision_tarif');
  }
  if (tableList.includes('operations_comptables_reduction')) {
    await queryInterface.dropTable('operations_comptables_reduction');
  }
  if (tableList.includes('types_condition_tarif')) {
    await queryInterface.dropTable('types_condition_tarif');
  }
}

module.exports = { up, down };
