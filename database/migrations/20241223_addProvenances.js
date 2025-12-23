/**
 * Migration: Ajout des tables de provenances d'articles
 *
 * Crée:
 * - provenances: liste des types de provenance (achat, don, échange, etc.)
 * - provenance_operation_comptable: mapping provenance -> opération comptable par structure
 * - Champs provenance sur les tables exemplaires
 */

const { sequelize } = require('../../backend/models');

// Provenances par défaut
const provenancesDefaut = [
  { code: 'achat', libelle: 'Achat', description: 'Article acheté (neuf ou occasion)', ordre: 1, icone: 'bi-cart', couleur: '#0d6efd' },
  { code: 'don', libelle: 'Don', description: 'Article reçu en don', ordre: 2, icone: 'bi-gift', couleur: '#198754' },
  { code: 'subvention', libelle: 'Subvention', description: 'Article acquis via subvention', ordre: 3, icone: 'bi-bank', couleur: '#6f42c1' },
  { code: 'echange', libelle: 'Échange', description: 'Article obtenu par échange', ordre: 4, icone: 'bi-arrow-left-right', couleur: '#fd7e14' },
  { code: 'pret', libelle: 'Prêt', description: 'Article prêté par un tiers (retour prévu)', ordre: 5, icone: 'bi-arrow-return-left', couleur: '#20c997' },
  { code: 'depot', libelle: 'Dépôt', description: 'Article en dépôt (propriété d\'un tiers)', ordre: 6, icone: 'bi-box-arrow-in-down', couleur: '#6c757d' },
  { code: 'depot-vente', libelle: 'Dépôt-vente', description: 'Article en dépôt pour vente éventuelle', ordre: 7, icone: 'bi-shop', couleur: '#ffc107' },
  { code: 'recuperation', libelle: 'Récupération', description: 'Article récupéré (désherbage d\'une autre structure)', ordre: 8, icone: 'bi-recycle', couleur: '#17a2b8' },
  { code: 'creation', libelle: 'Création interne', description: 'Article créé en interne (jeu maison, etc.)', ordre: 9, icone: 'bi-tools', couleur: '#e83e8c' },
  { code: 'inconnu', libelle: 'Inconnu', description: 'Provenance non documentée', ordre: 99, icone: 'bi-question-circle', couleur: '#adb5bd' }
];

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Vérifier les tables existantes
  const tables = await queryInterface.showAllTables();
  const tableList = tables.map(t => typeof t === 'string' ? t : Object.values(t)[0]);

  // ============================================
  // Table provenances
  // ============================================
  if (!tableList.includes('provenances')) {
    console.log('Création de la table provenances...');
    await queryInterface.createTable('provenances', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      libelle: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      icone: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'bi-box'
      },
      couleur: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: true,
        defaultValue: '#6c757d'
      },
      // Indique si cette provenance génère une entrée de stock (vs prêt/dépôt temporaire)
      est_acquisition: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Indique si l'article doit être retourné à un tiers
      retour_prevu: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      ordre: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    console.log('Table provenances créée');

    // Insérer les provenances par défaut
    console.log('Insertion des provenances par défaut...');
    for (const prov of provenancesDefaut) {
      const estAcquisition = !['pret', 'depot', 'depot-vente'].includes(prov.code);
      const retourPrevu = ['pret', 'depot'].includes(prov.code);

      await sequelize.query(
        `INSERT INTO provenances (code, libelle, description, icone, couleur, est_acquisition, retour_prevu, ordre, actif)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        { replacements: [prov.code, prov.libelle, prov.description, prov.icone, prov.couleur, estAcquisition, retourPrevu, prov.ordre] }
      );
    }
    console.log(`${provenancesDefaut.length} provenances insérées`);
  } else {
    console.log('Table provenances existe déjà');
  }

  // ============================================
  // Table provenance_operation_comptable (mapping par structure)
  // ============================================
  if (!tableList.includes('provenance_operation_comptable')) {
    console.log('Création de la table provenance_operation_comptable...');
    await queryInterface.createTable('provenance_operation_comptable', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      provenance_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'provenances',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      structure_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true, // NULL = configuration globale/défaut
        references: {
          model: 'structures',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      // Journal comptable
      journal_code: {
        type: sequelize.Sequelize.STRING(10),
        allowNull: true,
        comment: 'Code du journal (ex: ACH, OD)'
      },
      // Compte de charge ou produit
      compte_comptable: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: true,
        comment: 'Compte comptable (ex: 6061, 7713)'
      },
      compte_libelle: {
        type: sequelize.Sequelize.STRING(150),
        allowNull: true
      },
      // Compte de contrepartie (trésorerie, fournisseur, etc.)
      compte_contrepartie: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: true,
        comment: 'Compte de contrepartie (ex: 512, 401)'
      },
      compte_contrepartie_libelle: {
        type: sequelize.Sequelize.STRING(150),
        allowNull: true
      },
      // Section analytique
      section_analytique_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sections_analytiques',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      // Options
      generer_ecritures: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Générer automatiquement les écritures comptables'
      },
      prefixe_piece: {
        type: sequelize.Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'ENT',
        comment: 'Préfixe pour numéros de pièce'
      },
      actif: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Index unique pour éviter les doublons
    await queryInterface.addIndex('provenance_operation_comptable', ['provenance_id', 'structure_id'], {
      unique: true,
      name: 'idx_provenance_structure_unique'
    });

    console.log('Table provenance_operation_comptable créée');
  } else {
    console.log('Table provenance_operation_comptable existe déjà');
  }

  // ============================================
  // Ajout des champs bon d'entrée sur les exemplaires
  // ============================================
  const exemplairesTables = [
    'exemplaires_jeux',
    'exemplaires_livres',
    'exemplaires_films',
    'exemplaires_disques'
  ];

  for (const tableName of exemplairesTables) {
    if (!tableList.includes(tableName)) {
      console.log(`Table ${tableName} n'existe pas, skip`);
      continue;
    }

    // Vérifier les colonnes existantes
    const columns = await queryInterface.describeTable(tableName);

    // Ajouter provenance_id
    if (!columns.provenance_id) {
      console.log(`Ajout de provenance_id sur ${tableName}...`);
      await queryInterface.addColumn(tableName, 'provenance_id', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'provenances',
          key: 'id'
        },
        onDelete: 'SET NULL'
      });
    }

    // Ajouter date_entree (date du bon d'entrée)
    if (!columns.date_entree) {
      console.log(`Ajout de date_entree sur ${tableName}...`);
      await queryInterface.addColumn(tableName, 'date_entree', {
        type: sequelize.Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date d\'entrée dans la collection'
      });
    }

    // Ajouter fournisseur_donateur (nom du fournisseur ou donateur)
    if (!columns.fournisseur_donateur) {
      console.log(`Ajout de fournisseur_donateur sur ${tableName}...`);
      await queryInterface.addColumn(tableName, 'fournisseur_donateur', {
        type: sequelize.Sequelize.STRING(200),
        allowNull: true,
        comment: 'Nom du fournisseur, donateur ou prêteur'
      });
    }

    // Ajouter note_entree
    if (!columns.note_entree) {
      console.log(`Ajout de note_entree sur ${tableName}...`);
      await queryInterface.addColumn(tableName, 'note_entree', {
        type: sequelize.Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes sur l\'entrée en stock'
      });
    }

    // Ajouter reference_bon_entree (numéro de bon, facture, etc.)
    if (!columns.reference_bon_entree) {
      console.log(`Ajout de reference_bon_entree sur ${tableName}...`);
      await queryInterface.addColumn(tableName, 'reference_bon_entree', {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true,
        comment: 'Référence du bon d\'entrée ou facture'
      });
    }

    console.log(`Champs bon d'entrée ajoutés sur ${tableName}`);
  }

  console.log('Migration terminée avec succès');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // Supprimer les colonnes des exemplaires
  const exemplairesTables = [
    'exemplaires_jeux',
    'exemplaires_livres',
    'exemplaires_films',
    'exemplaires_disques'
  ];

  for (const tableName of exemplairesTables) {
    try {
      const columns = await queryInterface.describeTable(tableName);
      if (columns.reference_bon_entree) await queryInterface.removeColumn(tableName, 'reference_bon_entree');
      if (columns.note_entree) await queryInterface.removeColumn(tableName, 'note_entree');
      if (columns.fournisseur_donateur) await queryInterface.removeColumn(tableName, 'fournisseur_donateur');
      if (columns.date_entree) await queryInterface.removeColumn(tableName, 'date_entree');
      if (columns.provenance_id) await queryInterface.removeColumn(tableName, 'provenance_id');
      console.log(`Colonnes supprimées de ${tableName}`);
    } catch (error) {
      console.log(`Erreur sur ${tableName}: ${error.message}`);
    }
  }

  // Supprimer les tables
  try {
    await queryInterface.dropTable('provenance_operation_comptable');
    console.log('Table provenance_operation_comptable supprimée');
  } catch (error) {
    console.log('Erreur suppression provenance_operation_comptable:', error.message);
  }

  try {
    await queryInterface.dropTable('provenances');
    console.log('Table provenances supprimée');
  } catch (error) {
    console.log('Erreur suppression provenances:', error.message);
  }
}

module.exports = { up, down };
