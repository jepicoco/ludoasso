/**
 * Migration: Creation de la table modules_actifs
 * Gestion des modules activables/desactivables du site
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sequelize = require('../../backend/config/sequelize');
const { DataTypes } = require('sequelize');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('=== Migration Modules Actifs ===\n');

    // 1. Verifier si la table existe
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('modules_actifs');

    if (!tableExists) {
      // 2. Creer la table
      console.log('Creation de la table modules_actifs...');
      await queryInterface.createTable('modules_actifs', {
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
          allowNull: true,
          defaultValue: 'box'
        },
        couleur: {
          type: DataTypes.STRING(20),
          allowNull: true,
          defaultValue: 'secondary'
        },
        actif: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        ordre_affichage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
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
      console.log('Table modules_actifs creee.');
    }

    // 3. Inserer les modules par defaut
    console.log('\nInsertion des modules par defaut...');

    const modulesDefaut = [
      {
        code: 'scanner',
        libelle: 'Scanner',
        description: 'Scanner de codes-barres pour les adherents et les jeux. Desactive le bouton Scanner du menu.',
        icone: 'upc-scan',
        couleur: 'success',
        actif: true,
        ordre_affichage: 0
      },
      {
        code: 'ludotheque',
        libelle: 'Ludotheque',
        description: 'Gestion des jeux de societe. Desactive le menu Ludotheque et le module sur le site public.',
        icone: 'dice-6',
        couleur: '#FFE5B4',
        actif: true,
        ordre_affichage: 1
      },
      {
        code: 'bibliotheque',
        libelle: 'Bibliotheque',
        description: 'Gestion des livres et magazines. Desactive le menu Bibliotheque et le module sur le site public.',
        icone: 'book',
        couleur: '#B4D8E7',
        actif: true,
        ordre_affichage: 2
      },
      {
        code: 'filmotheque',
        libelle: 'Filmotheque',
        description: 'Gestion des films et DVD. Desactive le menu Filmotheque et le module sur le site public.',
        icone: 'film',
        couleur: '#E7B4D8',
        actif: true,
        ordre_affichage: 3
      },
      {
        code: 'discotheque',
        libelle: 'Discotheque',
        description: 'Gestion des disques et vinyles. Desactive le menu Discotheque et le module sur le site public.',
        icone: 'vinyl',
        couleur: '#B4E7C4',
        actif: true,
        ordre_affichage: 4
      },
      {
        code: 'comptabilite',
        libelle: 'Comptabilite',
        description: 'Onglet Comptabilite dans les parametres (tarifs, codes reduction, comptes bancaires).',
        icone: 'calculator',
        couleur: 'warning',
        actif: true,
        ordre_affichage: 5
      },
      {
        code: 'communications',
        libelle: 'Communications',
        description: 'Envoi d\'emails et SMS. Desactive le menu Communications, l\'onglet dans les parametres, et bloque les envois automatiques.',
        icone: 'envelope',
        couleur: 'info',
        actif: true,
        ordre_affichage: 6
      },
      {
        code: 'outils',
        libelle: 'Outils',
        description: 'Onglet Outils dans les parametres (import, archives RGPD, export, maintenance).',
        icone: 'tools',
        couleur: 'secondary',
        actif: true,
        ordre_affichage: 7
      }
    ];

    for (const module of modulesDefaut) {
      // Verifier si le module existe deja
      const [existing] = await sequelize.query(
        `SELECT id FROM modules_actifs WHERE code = ?`,
        { replacements: [module.code] }
      );

      if (existing.length > 0) {
        console.log(`  - ${module.libelle} (${module.code}) - existe deja`);
      } else {
        await queryInterface.bulkInsert('modules_actifs', [{
          ...module,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        console.log(`  - ${module.libelle} (${module.code}) - ajoute`);
      }
    }

    console.log('\n=== Migration terminee avec succes ===');

  } catch (error) {
    console.error('\nErreur lors de la migration:', error.message);
    throw error;
  }
}

// Execution si appele directement
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\nMigration terminee.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

module.exports = migrate;
