// Charger les variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sequelize = require('../../backend/config/sequelize');
const { DataTypes } = require('sequelize');

/**
 * Migration pour ajouter la gestion comptable avancee:
 * - Table taux_tva (Taux de TVA)
 * - Table sections_analytiques (Axes analytiques)
 * - Table repartitions_analytiques (Repartition multi-axes)
 * - Colonne taux_tva_id dans tarifs_cotisation
 * - Colonnes TVA dans parametres_front
 */
async function migrate() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('===== MIGRATION COMPTABILITE AVANCEE =====\n');

    // ==========================================
    // 1. TABLE TAUX_TVA
    // ==========================================
    console.log('1. Verification de la table taux_tva...');
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('taux_tva')) {
      console.log('   Creation de la table taux_tva...');

      await queryInterface.createTable('taux_tva', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: DataTypes.STRING(10),
          allowNull: false,
          unique: true,
          comment: 'Code court (ex: TVA20, TVA10, TVA55, TVA21, EXO)'
        },
        libelle: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: 'Libelle complet'
        },
        taux: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Taux en pourcentage'
        },
        compte_tva_collectee: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment: 'Compte comptable TVA collectee (ex: 44571)'
        },
        compte_tva_deductible: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment: 'Compte comptable TVA deductible (ex: 44566)'
        },
        mention_facture: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'Mention obligatoire sur facture'
        },
        exonere: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'True si exoneration'
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

      // Inserer les taux par defaut
      console.log('   Insertion des taux TVA par defaut...');
      await queryInterface.bulkInsert('taux_tva', [
        {
          code: 'EXO',
          libelle: 'Exonere de TVA (associations)',
          taux: 0,
          compte_tva_collectee: null,
          compte_tva_deductible: null,
          mention_facture: 'TVA non applicable - Article 293B du CGI',
          exonere: true,
          actif: true,
          ordre_affichage: 0,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'TVA20',
          libelle: 'TVA 20% (taux normal)',
          taux: 20.00,
          compte_tva_collectee: '44571',
          compte_tva_deductible: '44566',
          mention_facture: null,
          exonere: false,
          actif: true,
          ordre_affichage: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'TVA10',
          libelle: 'TVA 10% (taux intermediaire)',
          taux: 10.00,
          compte_tva_collectee: '44571',
          compte_tva_deductible: '44566',
          mention_facture: null,
          exonere: false,
          actif: true,
          ordre_affichage: 2,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'TVA55',
          libelle: 'TVA 5,5% (taux reduit)',
          taux: 5.50,
          compte_tva_collectee: '44571',
          compte_tva_deductible: '44566',
          mention_facture: null,
          exonere: false,
          actif: true,
          ordre_affichage: 3,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'TVA21',
          libelle: 'TVA 2,1% (taux super-reduit)',
          taux: 2.10,
          compte_tva_collectee: '44571',
          compte_tva_deductible: '44566',
          mention_facture: null,
          exonere: false,
          actif: true,
          ordre_affichage: 4,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      console.log('   ✅ Table taux_tva creee avec succes');
    } else {
      console.log('   ✅ Table taux_tva existe deja');
    }

    // ==========================================
    // 2. TABLE SECTIONS_ANALYTIQUES
    // ==========================================
    console.log('\n2. Verification de la table sections_analytiques...');

    if (!tables.includes('sections_analytiques')) {
      console.log('   Creation de la table sections_analytiques...');

      await queryInterface.createTable('sections_analytiques', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: DataTypes.STRING(20),
          allowNull: false,
          unique: true,
          comment: 'Code analytique (ex: LUDO, BIBLIO, ATELIER)'
        },
        libelle: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: 'Libelle complet'
        },
        axe: {
          type: DataTypes.ENUM('activite', 'site', 'projet', 'financeur', 'autre'),
          allowNull: false,
          defaultValue: 'activite',
          comment: 'Axe analytique pour regroupement'
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        compte_analytique: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment: 'Code comptable analytique pour export'
        },
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'sections_analytiques',
            key: 'id'
          },
          comment: 'Section parente pour hierarchie'
        },
        couleur: {
          type: DataTypes.STRING(7),
          allowNull: true,
          defaultValue: '#6c757d'
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

      // Inserer des sections par defaut
      console.log('   Insertion des sections analytiques par defaut...');
      await queryInterface.bulkInsert('sections_analytiques', [
        // Axe Activite
        {
          code: 'COTIS',
          libelle: 'Cotisations',
          axe: 'activite',
          description: 'Cotisations des adherents',
          compte_analytique: 'AN01',
          parent_id: null,
          couleur: '#28a745',
          actif: true,
          ordre_affichage: 0,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'LUDO',
          libelle: 'Ludotheque',
          axe: 'activite',
          description: 'Activites ludotheque (prets de jeux)',
          compte_analytique: 'AN02',
          parent_id: null,
          couleur: '#007bff',
          actif: true,
          ordre_affichage: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'BIBLIO',
          libelle: 'Bibliotheque',
          axe: 'activite',
          description: 'Activites bibliotheque (prets de livres)',
          compte_analytique: 'AN03',
          parent_id: null,
          couleur: '#6f42c1',
          actif: true,
          ordre_affichage: 2,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'FILMO',
          libelle: 'Filmotheque',
          axe: 'activite',
          description: 'Activites filmotheque (prets de films)',
          compte_analytique: 'AN04',
          parent_id: null,
          couleur: '#dc3545',
          actif: true,
          ordre_affichage: 3,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'DISCO',
          libelle: 'Discotheque',
          axe: 'activite',
          description: 'Activites discotheque (prets de disques)',
          compte_analytique: 'AN05',
          parent_id: null,
          couleur: '#fd7e14',
          actif: true,
          ordre_affichage: 4,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'ANIM',
          libelle: 'Animations',
          axe: 'activite',
          description: 'Animations et ateliers',
          compte_analytique: 'AN06',
          parent_id: null,
          couleur: '#20c997',
          actif: true,
          ordre_affichage: 5,
          created_at: new Date(),
          updated_at: new Date()
        },
        // Axe Financeur (pour subventions)
        {
          code: 'CAF',
          libelle: 'CAF',
          axe: 'financeur',
          description: 'Subventions CAF',
          compte_analytique: 'FI01',
          parent_id: null,
          couleur: '#17a2b8',
          actif: true,
          ordre_affichage: 10,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          code: 'MAIRIE',
          libelle: 'Mairie',
          axe: 'financeur',
          description: 'Subventions municipales',
          compte_analytique: 'FI02',
          parent_id: null,
          couleur: '#6c757d',
          actif: true,
          ordre_affichage: 11,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      console.log('   ✅ Table sections_analytiques creee avec succes');
    } else {
      console.log('   ✅ Table sections_analytiques existe deja');
    }

    // ==========================================
    // 3. TABLE REPARTITIONS_ANALYTIQUES
    // ==========================================
    console.log('\n3. Verification de la table repartitions_analytiques...');

    if (!tables.includes('repartitions_analytiques')) {
      console.log('   Creation de la table repartitions_analytiques...');

      await queryInterface.createTable('repartitions_analytiques', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        prestation_type: {
          type: DataTypes.ENUM('tarif_cotisation', 'tarif_location', 'tarif_retard', 'tarif_animation', 'autre'),
          allowNull: false,
          comment: 'Type de prestation associee'
        },
        prestation_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'ID de la prestation'
        },
        section_analytique_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'sections_analytiques',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        pourcentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 100.00,
          comment: 'Pourcentage de repartition'
        },
        ordre: {
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

      // Ajouter les index
      await queryInterface.addIndex('repartitions_analytiques',
        ['prestation_type', 'prestation_id', 'section_analytique_id'],
        { unique: true, name: 'idx_repartition_unique' }
      );

      await queryInterface.addIndex('repartitions_analytiques',
        ['prestation_type', 'prestation_id'],
        { name: 'idx_repartition_prestation' }
      );

      console.log('   ✅ Table repartitions_analytiques creee avec succes');
    } else {
      console.log('   ✅ Table repartitions_analytiques existe deja');
    }

    // ==========================================
    // 4. COLONNE TAUX_TVA_ID DANS TARIFS_COTISATION
    // ==========================================
    console.log('\n4. Verification de la colonne taux_tva_id dans tarifs_cotisation...');

    const tarifsCols = await queryInterface.describeTable('tarifs_cotisation');

    if (!tarifsCols.taux_tva_id) {
      console.log('   Ajout de la colonne taux_tva_id...');

      await queryInterface.addColumn('tarifs_cotisation', 'taux_tva_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'taux_tva',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Taux de TVA applicable'
      });

      console.log('   ✅ Colonne taux_tva_id ajoutee');
    } else {
      console.log('   ✅ Colonne taux_tva_id existe deja');
    }

    // ==========================================
    // 5. COLONNES TVA DANS PARAMETRES_FRONT
    // ==========================================
    console.log('\n5. Verification des colonnes TVA dans parametres_front...');

    const paramFrontCols = await queryInterface.describeTable('parametres_front');

    const colonnesTVA = [
      { name: 'tva_assujetti', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'tva_numero', type: DataTypes.STRING(20), defaultValue: null },
      { name: 'cotisations_soumis_tva', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'cotisations_taux_tva_id', type: DataTypes.INTEGER, defaultValue: null },
      { name: 'ludotheque_soumis_tva', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'ludotheque_taux_tva_id', type: DataTypes.INTEGER, defaultValue: null },
      { name: 'bibliotheque_soumis_tva', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'bibliotheque_taux_tva_id', type: DataTypes.INTEGER, defaultValue: null },
      { name: 'filmotheque_soumis_tva', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'filmotheque_taux_tva_id', type: DataTypes.INTEGER, defaultValue: null },
      { name: 'discotheque_soumis_tva', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'discotheque_taux_tva_id', type: DataTypes.INTEGER, defaultValue: null },
      { name: 'animations_soumis_tva', type: DataTypes.BOOLEAN, defaultValue: false },
      { name: 'animations_taux_tva_id', type: DataTypes.INTEGER, defaultValue: null }
    ];

    for (const col of colonnesTVA) {
      if (!paramFrontCols[col.name]) {
        console.log(`   Ajout de la colonne ${col.name}...`);
        await queryInterface.addColumn('parametres_front', col.name, {
          type: col.type,
          allowNull: true,
          defaultValue: col.defaultValue
        });
      }
    }

    console.log('   ✅ Colonnes TVA verifiees/ajoutees');

    // ==========================================
    // FIN
    // ==========================================
    console.log('\n===== MIGRATION TERMINEE AVEC SUCCES =====\n');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Execution si appele directement
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration terminee avec succes');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = migrate;
