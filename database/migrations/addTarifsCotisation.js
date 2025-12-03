// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sequelize = require('../../backend/config/sequelize');
const { DataTypes } = require('sequelize');

/**
 * Migration pour créer la table tarifs_cotisation
 */
async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔧 Vérification de la table tarifs_cotisation...');

    // Vérifier si la table existe
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('tarifs_cotisation');

    if (tableExists) {
      console.log('✅ La table tarifs_cotisation existe déjà');
      return;
    }

    console.log('📋 Création de la table tarifs_cotisation...');

    await queryInterface.createTable('tarifs_cotisation', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      libelle: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nom du tarif (ex: "Tarif annuel standard", "Tarif étudiant")'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description détaillée du tarif'
      },
      type_periode: {
        type: DataTypes.ENUM('annee_civile', 'annee_scolaire', 'date_a_date'),
        allowNull: false,
        defaultValue: 'annee_civile',
        comment: 'Type de période: année civile (1er jan-31 déc), année scolaire (1er sep-31 août), ou date à date'
      },
      type_montant: {
        type: DataTypes.ENUM('fixe', 'prorata'),
        allowNull: false,
        defaultValue: 'fixe',
        comment: 'Montant fixe ou calculé au prorata du mois entamé'
      },
      montant_base: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0
        },
        comment: 'Montant de base de la cotisation en euros'
      },
      reduction_association_type: {
        type: DataTypes.ENUM('pourcentage', 'montant'),
        allowNull: false,
        defaultValue: 'pourcentage',
        comment: 'Type de réduction pour les adhérents à l\'association'
      },
      reduction_association_valeur: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Valeur de la réduction (pourcentage ou montant en euros)'
      },
      actif: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Tarif actif et utilisable'
      },
      date_debut_validite: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date à partir de laquelle ce tarif est valide'
      },
      date_fin_validite: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date jusqu\'à laquelle ce tarif est valide'
      },
      ordre_affichage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordre d\'affichage dans les listes'
      },
      code_comptable: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Code comptable associé au tarif'
      },
      code_analytique: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Code analytique associé au tarif'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    console.log('✅ Table tarifs_cotisation créée avec succès');

    // Créer un tarif par défaut
    console.log('📋 Ajout d\'un tarif par défaut...');

    await queryInterface.bulkInsert('tarifs_cotisation', [{
      libelle: 'Adhésion annuelle standard',
      description: 'Tarif d\'adhésion annuel standard',
      type_periode: 'annee_civile',
      type_montant: 'fixe',
      montant_base: 25.00,
      reduction_association_type: 'pourcentage',
      reduction_association_valeur: 0,
      actif: true,
      ordre_affichage: 0,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    console.log('✅ Tarif par défaut créé avec succès');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = migrate;
