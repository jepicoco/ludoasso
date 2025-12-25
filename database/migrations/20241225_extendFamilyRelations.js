/**
 * Migration: Extension du système de relations familiales
 *
 * - Étend type_lien_famille avec les nouveaux types de relations
 * - Crée la table foyers pour regrouper les membres d'un ménage
 * - Crée la table membres_foyer pour gérer la garde partagée
 * - Ajoute le champ garde_partagee sur Utilisateur
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    // 1. Étendre l'ENUM type_lien_famille
    console.log('Extension de type_lien_famille...');

    // En MySQL, il faut ALTER la colonne pour changer l'ENUM
    await sequelize.query(`
      ALTER TABLE utilisateurs
      MODIFY COLUMN type_lien_famille ENUM(
        'parent', 'tuteur', 'autre',
        'conjoint', 'marie', 'mariee',
        'pere', 'mere',
        'fils', 'fille',
        'beau_pere', 'belle_mere',
        'beau_fils', 'belle_fille',
        'frere', 'soeur',
        'grand_pere', 'grand_mere',
        'petit_fils', 'petite_fille',
        'oncle', 'tante',
        'neveu', 'niece',
        'cousin', 'cousine'
      ) NULL
    `, { transaction });

    // 2. Créer la table foyers (ménages)
    console.log('Création de la table foyers...');
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('foyers')) {
      await queryInterface.createTable('foyers', {
        id: {
          type: sequelize.Sequelize.DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        nom: {
          type: sequelize.Sequelize.DataTypes.STRING(100),
          allowNull: true,
          comment: 'Nom du foyer (optionnel, ex: "Famille Dupont")'
        },
        responsable_principal_id: {
          type: sequelize.Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'utilisateurs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'Responsable principal du foyer'
        },
        adresse: {
          type: sequelize.Sequelize.DataTypes.TEXT,
          allowNull: true
        },
        ville: {
          type: sequelize.Sequelize.DataTypes.STRING(100),
          allowNull: true
        },
        code_postal: {
          type: sequelize.Sequelize.DataTypes.STRING(10),
          allowNull: true
        },
        telephone: {
          type: sequelize.Sequelize.DataTypes.STRING(20),
          allowNull: true
        },
        quotient_familial: {
          type: sequelize.Sequelize.DataTypes.INTEGER,
          allowNull: true,
          comment: 'QF du foyer (hérité par les membres)'
        },
        structure_id: {
          type: sequelize.Sequelize.DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'structures',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        notes: {
          type: sequelize.Sequelize.DataTypes.TEXT,
          allowNull: true
        },
        created_at: {
          type: sequelize.Sequelize.DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.Sequelize.fn('NOW')
        },
        updated_at: {
          type: sequelize.Sequelize.DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.Sequelize.fn('NOW')
        }
      }, { transaction });

      // Index pour le responsable principal
      await queryInterface.addIndex('foyers', ['responsable_principal_id'], {
        name: 'idx_foyers_responsable',
        transaction
      });
    }

    // 3. Créer la table membres_foyer (liaison utilisateur-foyer avec garde partagée)
    console.log('Création de la table membres_foyer...');

    if (!tables.includes('membres_foyer')) {
      await queryInterface.createTable('membres_foyer', {
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
          comment: 'Membre du foyer'
        },
        foyer_id: {
          type: sequelize.Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'foyers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foyer auquel appartient le membre'
        },
        type_lien: {
          type: sequelize.Sequelize.DataTypes.ENUM(
            'responsable', 'conjoint', 'enfant',
            'parent', 'beau_parent', 'autre_adulte'
          ),
          allowNull: false,
          defaultValue: 'enfant',
          comment: 'Rôle dans le foyer'
        },
        lien_parente: {
          type: sequelize.Sequelize.DataTypes.STRING(50),
          allowNull: true,
          comment: 'Lien de parenté détaillé (fils, fille, belle-fille...)'
        },
        est_foyer_principal: {
          type: sequelize.Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Foyer principal (pour garde partagée)'
        },
        pourcentage_garde: {
          type: sequelize.Sequelize.DataTypes.INTEGER,
          allowNull: true,
          comment: 'Pourcentage de garde (50%, 70%, etc.) - null = 100%'
        },
        jours_garde: {
          type: sequelize.Sequelize.DataTypes.JSON,
          allowNull: true,
          comment: 'Configuration des jours de garde (ex: {"lundi": true, "mardi": true...})'
        },
        semaines_garde: {
          type: sequelize.Sequelize.DataTypes.STRING(100),
          allowNull: true,
          comment: 'Configuration des semaines (ex: "paires", "impaires", "1,3" pour 1ère et 3ème)'
        },
        herite_adresse: {
          type: sequelize.Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Hérite de l\'adresse du foyer'
        },
        herite_qf: {
          type: sequelize.Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Hérite du QF du foyer'
        },
        date_debut: {
          type: sequelize.Sequelize.DataTypes.DATEONLY,
          allowNull: true,
          comment: 'Date de début dans ce foyer'
        },
        date_fin: {
          type: sequelize.Sequelize.DataTypes.DATEONLY,
          allowNull: true,
          comment: 'Date de fin (si quitte le foyer)'
        },
        notes: {
          type: sequelize.Sequelize.DataTypes.TEXT,
          allowNull: true,
          comment: 'Notes sur la garde/arrangement'
        },
        created_at: {
          type: sequelize.Sequelize.DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.Sequelize.fn('NOW')
        },
        updated_at: {
          type: sequelize.Sequelize.DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.Sequelize.fn('NOW')
        }
      }, { transaction });

      // Index unique: un utilisateur ne peut être lié qu'une fois à un foyer
      await queryInterface.addIndex('membres_foyer', ['utilisateur_id', 'foyer_id'], {
        name: 'idx_membres_foyer_unique',
        unique: true,
        transaction
      });

      // Index pour recherche par utilisateur
      await queryInterface.addIndex('membres_foyer', ['utilisateur_id'], {
        name: 'idx_membres_foyer_utilisateur',
        transaction
      });

      // Index pour recherche par foyer
      await queryInterface.addIndex('membres_foyer', ['foyer_id'], {
        name: 'idx_membres_foyer_foyer',
        transaction
      });
    }

    // 4. Ajouter colonnes sur utilisateurs
    console.log('Ajout des colonnes garde_partagee et foyer_principal_id...');

    const [columns] = await sequelize.query(
      `SHOW COLUMNS FROM utilisateurs WHERE Field IN ('garde_partagee', 'foyer_principal_id')`,
      { transaction }
    );

    const existingColumns = columns.map(c => c.Field);

    if (!existingColumns.includes('garde_partagee')) {
      await queryInterface.addColumn('utilisateurs', 'garde_partagee', {
        type: sequelize.Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Cet utilisateur est en garde partagée'
      }, { transaction });
    }

    if (!existingColumns.includes('foyer_principal_id')) {
      await queryInterface.addColumn('utilisateurs', 'foyer_principal_id', {
        type: sequelize.Sequelize.DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'foyers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Foyer principal (pour affichage par défaut)'
      }, { transaction });
    }

    await transaction.commit();
    console.log('Migration terminée avec succès');

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la migration:', error);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    // Supprimer les colonnes ajoutées
    const [columns] = await sequelize.query(
      `SHOW COLUMNS FROM utilisateurs WHERE Field IN ('garde_partagee', 'foyer_principal_id')`,
      { transaction }
    );

    for (const col of columns) {
      await queryInterface.removeColumn('utilisateurs', col.Field, { transaction });
    }

    // Supprimer les tables
    const tables = await queryInterface.showAllTables();

    if (tables.includes('membres_foyer')) {
      await queryInterface.dropTable('membres_foyer', { transaction });
    }

    if (tables.includes('foyers')) {
      await queryInterface.dropTable('foyers', { transaction });
    }

    // Réduire l'ENUM (optionnel, peut causer des pertes de données)
    await sequelize.query(`
      ALTER TABLE utilisateurs
      MODIFY COLUMN type_lien_famille ENUM('parent', 'tuteur', 'autre') NULL
    `, { transaction });

    await transaction.commit();
    console.log('Rollback terminé');

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors du rollback:', error);
    throw error;
  }
}

module.exports = { up, down };
