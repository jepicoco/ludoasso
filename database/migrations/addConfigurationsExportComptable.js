/**
 * Migration: Add configurations_export_comptable table
 * Table pour gerer les configurations d'export comptable multi-formats
 * (Sage, Ciel, EBP, Quadra, OpenConcerto, Dolibarr, etc.)
 *
 * Run: node database/migrations/addConfigurationsExportComptable.js up
 * Rollback: node database/migrations/addConfigurationsExportComptable.js down
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ludotheque',
  port: process.env.DB_PORT || 3306
};

// Configurations par defaut des formats d'export
const defaultFormats = [
  {
    format: 'fec',
    libelle: 'FEC (Fichier des Ecritures Comptables)',
    separateur: '\t',
    separateur_decimal: ',',
    format_date: 'YYYYMMDD',
    encodage: 'UTF-8',
    extension: '.txt',
    inclure_entete: true,
    guillemets_texte: false,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'JournalCode', champ: 'journal_code', largeur: 10 },
      { nom: 'JournalLib', champ: 'journal_lib', largeur: 40 },
      { nom: 'EcritureNum', champ: 'piece_comptable', largeur: 20 },
      { nom: 'EcritureDate', champ: 'date_ecriture', format: 'YYYYMMDD' },
      { nom: 'CompteNum', champ: 'compte_general', largeur: 12 },
      { nom: 'CompteLib', champ: 'compte_lib', largeur: 40 },
      { nom: 'CompAuxNum', champ: 'compte_auxiliaire', largeur: 20 },
      { nom: 'CompAuxLib', champ: 'compte_aux_lib', largeur: 40 },
      { nom: 'PieceRef', champ: 'piece_reference', largeur: 20 },
      { nom: 'PieceDate', champ: 'date_piece', format: 'YYYYMMDD' },
      { nom: 'EcritureLib', champ: 'libelle', largeur: 80 },
      { nom: 'Debit', champ: 'debit', format: 'decimal' },
      { nom: 'Credit', champ: 'credit', format: 'decimal' },
      { nom: 'EcritureLet', champ: 'lettrage', largeur: 10 },
      { nom: 'DateLet', champ: 'date_lettrage', format: 'YYYYMMDD' },
      { nom: 'ValidDate', champ: 'date_validation', format: 'YYYYMMDD' },
      { nom: 'Montantdevise', champ: 'montant_devise', format: 'decimal' },
      { nom: 'Idevise', champ: 'devise', largeur: 3 }
    ]),
    description: 'Format officiel FEC pour le controle fiscal. Obligatoire en France.',
    documentation_url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000027804775',
    par_defaut: true,
    ordre_affichage: 0
  },
  {
    format: 'sage',
    libelle: 'Sage (PNM Import)',
    separateur: ';',
    separateur_decimal: ',',
    format_date: 'DD/MM/YYYY',
    encodage: 'CP1252',
    extension: '.pnm',
    inclure_entete: false,
    guillemets_texte: true,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'Type', champ: 'type_ligne', largeur: 1, defaut: 'M' },
      { nom: 'Journal', champ: 'journal_code', largeur: 3 },
      { nom: 'Date', champ: 'date_ecriture', format: 'DD/MM/YYYY' },
      { nom: 'Piece', champ: 'piece_comptable', largeur: 13 },
      { nom: 'Compte', champ: 'compte_general', largeur: 13 },
      { nom: 'Tiers', champ: 'compte_auxiliaire', largeur: 17 },
      { nom: 'Libelle', champ: 'libelle', largeur: 35 },
      { nom: 'Debit', champ: 'debit', format: 'decimal' },
      { nom: 'Credit', champ: 'credit', format: 'decimal' },
      { nom: 'Echeance', champ: 'date_echeance', format: 'DD/MM/YYYY' },
      { nom: 'Reference', champ: 'piece_reference', largeur: 35 }
    ]),
    description: 'Format PNM pour import Sage 50/100. Compatible Sage Petites Entreprises.',
    documentation_url: 'https://www.sage.com/fr-fr/',
    ordre_affichage: 1
  },
  {
    format: 'ciel',
    libelle: 'Ciel Compta (XIMPORT)',
    separateur: '\t',
    separateur_decimal: ',',
    format_date: 'DD/MM/YYYY',
    encodage: 'CP1252',
    extension: '.txt',
    inclure_entete: false,
    guillemets_texte: false,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'Date', champ: 'date_ecriture', format: 'DD/MM/YYYY' },
      { nom: 'CodeJournal', champ: 'journal_code', largeur: 2 },
      { nom: 'NumeroCompte', champ: 'compte_general', largeur: 11 },
      { nom: 'CodeAnalytique', champ: 'section_analytique', largeur: 6 },
      { nom: 'Libelle', champ: 'libelle', largeur: 60 },
      { nom: 'MontantDebit', champ: 'debit', format: 'decimal' },
      { nom: 'MontantCredit', champ: 'credit', format: 'decimal' },
      { nom: 'NumeroPiece', champ: 'piece_comptable', largeur: 12 },
      { nom: 'Reference', champ: 'piece_reference', largeur: 40 },
      { nom: 'DateEcheance', champ: 'date_echeance', format: 'DD/MM/YYYY' },
      { nom: 'CodeDevise', champ: 'devise', largeur: 3, defaut: 'EUR' }
    ]),
    description: 'Format XIMPORT pour Ciel Compta. Compatible toutes versions.',
    documentation_url: 'https://www.ciel.com/',
    ordre_affichage: 2
  },
  {
    format: 'ebp',
    libelle: 'EBP Compta',
    separateur: ';',
    separateur_decimal: ',',
    format_date: 'DD/MM/YYYY',
    encodage: 'CP1252',
    extension: '.txt',
    inclure_entete: true,
    guillemets_texte: true,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'Journal', champ: 'journal_code', largeur: 6 },
      { nom: 'Date', champ: 'date_ecriture', format: 'DD/MM/YYYY' },
      { nom: 'Compte', champ: 'compte_general', largeur: 12 },
      { nom: 'Piece', champ: 'piece_comptable', largeur: 15 },
      { nom: 'Libelle', champ: 'libelle', largeur: 50 },
      { nom: 'Debit', champ: 'debit', format: 'decimal' },
      { nom: 'Credit', champ: 'credit', format: 'decimal' },
      { nom: 'Echeance', champ: 'date_echeance', format: 'DD/MM/YYYY' },
      { nom: 'Pointage', champ: 'lettrage', largeur: 10 }
    ]),
    description: 'Format standard EBP Compta. Compatible EBP Compta Classic/PRO.',
    documentation_url: 'https://www.ebp.com/',
    ordre_affichage: 3
  },
  {
    format: 'quadra',
    libelle: 'Quadratus (ASCII)',
    separateur: ';',
    separateur_decimal: ',',
    format_date: 'DDMMYYYY',
    encodage: 'CP1252',
    extension: '.txt',
    inclure_entete: false,
    guillemets_texte: false,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'M', champ: 'type_ligne', largeur: 1, defaut: 'M' },
      { nom: 'NumeroCompte', champ: 'compte_general', largeur: 8 },
      { nom: 'CodeJournal', champ: 'journal_code', largeur: 2 },
      { nom: 'Folio', champ: 'folio', largeur: 3, defaut: '000' },
      { nom: 'Date', champ: 'date_ecriture', format: 'DDMMYYYY' },
      { nom: 'SensEcriture', champ: 'sens', largeur: 1 },
      { nom: 'Montant', champ: 'montant', format: 'entier_centimes', largeur: 12 },
      { nom: 'Libelle', champ: 'libelle', largeur: 20 },
      { nom: 'NumeroPiece', champ: 'piece_comptable', largeur: 10 },
      { nom: 'DateEcheance', champ: 'date_echeance', format: 'DDMMYYYY' }
    ]),
    options_format: JSON.stringify({
      sens_debit: 'D',
      sens_credit: 'C',
      montant_centimes: true
    }),
    description: 'Format ASCII Quadratus/Cegid. Export ligne par ligne.',
    documentation_url: 'https://www.cegid.com/fr/produits/quadra/',
    ordre_affichage: 4
  },
  {
    format: 'openconcerto',
    libelle: 'OpenConcerto (CSV)',
    separateur: ';',
    separateur_decimal: '.',
    format_date: 'DD/MM/YYYY',
    encodage: 'UTF-8',
    extension: '.csv',
    inclure_entete: true,
    guillemets_texte: true,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'DATE', champ: 'date_ecriture', format: 'DD/MM/YYYY' },
      { nom: 'JOURNAL', champ: 'journal_code', largeur: 10 },
      { nom: 'NUMERO', champ: 'piece_comptable', largeur: 20 },
      { nom: 'COMPTE', champ: 'compte_general', largeur: 12 },
      { nom: 'LIBELLE', champ: 'libelle', largeur: 100 },
      { nom: 'DEBIT', champ: 'debit', format: 'decimal' },
      { nom: 'CREDIT', champ: 'credit', format: 'decimal' },
      { nom: 'ANALYTIQUE', champ: 'section_analytique', largeur: 20 }
    ]),
    description: 'Format CSV pour OpenConcerto (logiciel libre de gestion).',
    documentation_url: 'https://www.openconcerto.org/',
    ordre_affichage: 5
  },
  {
    format: 'dolibarr',
    libelle: 'Dolibarr (CSV)',
    separateur: ';',
    separateur_decimal: '.',
    format_date: 'YYYY-MM-DD',
    encodage: 'UTF-8',
    extension: '.csv',
    inclure_entete: true,
    guillemets_texte: true,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'date', champ: 'date_ecriture', format: 'YYYY-MM-DD' },
      { nom: 'journal', champ: 'journal_code', largeur: 10 },
      { nom: 'piece', champ: 'piece_comptable', largeur: 30 },
      { nom: 'compte', champ: 'compte_general', largeur: 12 },
      { nom: 'label', champ: 'libelle', largeur: 128 },
      { nom: 'subledger_account', champ: 'compte_auxiliaire', largeur: 24 },
      { nom: 'debit', champ: 'debit', format: 'decimal' },
      { nom: 'credit', champ: 'credit', format: 'decimal' }
    ]),
    description: 'Format CSV compatible module comptabilite Dolibarr.',
    documentation_url: 'https://wiki.dolibarr.org/index.php/Module_Comptabilit%C3%A9_en_partie_double',
    ordre_affichage: 6
  },
  {
    format: 'csv',
    libelle: 'CSV Generique',
    separateur: ';',
    separateur_decimal: ',',
    format_date: 'DD/MM/YYYY',
    encodage: 'UTF-8',
    extension: '.csv',
    inclure_entete: true,
    guillemets_texte: true,
    precision_decimale: 2,
    colonnes: JSON.stringify([
      { nom: 'Date', champ: 'date_ecriture', format: 'DD/MM/YYYY' },
      { nom: 'Journal', champ: 'journal_code' },
      { nom: 'N Piece', champ: 'piece_comptable' },
      { nom: 'Compte', champ: 'compte_general' },
      { nom: 'Libelle', champ: 'libelle' },
      { nom: 'Debit', champ: 'debit', format: 'decimal' },
      { nom: 'Credit', champ: 'credit', format: 'decimal' },
      { nom: 'Compte Tiers', champ: 'compte_auxiliaire' },
      { nom: 'Reference', champ: 'piece_reference' }
    ]),
    description: 'Format CSV generique, personnalisable pour tout logiciel.',
    ordre_affichage: 7
  },
  {
    format: 'json',
    libelle: 'JSON (API)',
    separateur: '',
    separateur_decimal: '.',
    format_date: 'YYYY-MM-DD',
    encodage: 'UTF-8',
    extension: '.json',
    inclure_entete: false,
    guillemets_texte: false,
    precision_decimale: 2,
    colonnes: JSON.stringify([]),
    description: 'Export JSON structure pour integration API.',
    ordre_affichage: 8
  }
];

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('Creating configurations_export_comptable table...');

    // Verifier si la table existe deja
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'configurations_export_comptable'"
    );

    if (tables.length > 0) {
      console.log('Table configurations_export_comptable already exists, skipping...');
      return;
    }

    await connection.query(`
      CREATE TABLE configurations_export_comptable (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Format d'export (unique)
        format ENUM('fec', 'sage', 'ciel', 'ebp', 'quadra', 'openconcerto', 'dolibarr', 'csv', 'json') NOT NULL UNIQUE COMMENT 'Format d\\'export',

        -- Libelle
        libelle VARCHAR(100) NOT NULL COMMENT 'Nom affiche du format',

        -- Configuration du fichier
        separateur VARCHAR(10) DEFAULT ';' COMMENT 'Separateur de colonnes (;|,|TAB)',
        separateur_decimal VARCHAR(5) DEFAULT ',' COMMENT 'Separateur decimal (. ou ,)',
        separateur_milliers VARCHAR(5) DEFAULT '' COMMENT 'Separateur de milliers (espace ou rien)',
        format_date VARCHAR(20) DEFAULT 'DD/MM/YYYY' COMMENT 'Format de date (DD/MM/YYYY, YYYY-MM-DD, YYYYMMDD)',
        encodage ENUM('UTF-8', 'ISO-8859-1', 'CP1252', 'UTF-16') DEFAULT 'UTF-8' COMMENT 'Encodage du fichier',
        extension VARCHAR(10) DEFAULT '.txt' COMMENT 'Extension du fichier',

        -- Structure du fichier
        inclure_entete BOOLEAN DEFAULT TRUE COMMENT 'Inclure ligne d\\'entete',
        inclure_pied BOOLEAN DEFAULT FALSE COMMENT 'Inclure ligne de pied',
        guillemets_texte BOOLEAN DEFAULT FALSE COMMENT 'Entourer texte de guillemets',
        precision_decimale INT DEFAULT 2 COMMENT 'Nombre de decimales (2 ou 4)',

        -- Mapping des colonnes (JSON)
        colonnes JSON NULL COMMENT 'Definition des colonnes dans l\\'ordre [{nom, champ, largeur, format}]',

        -- Mapping des comptes (JSON) - transformation des codes comptables
        mapping_comptes JSON DEFAULT '{}' COMMENT 'Mapping code_interne -> code_externe pour les comptes',

        -- Mapping des journaux (JSON)
        mapping_journaux JSON DEFAULT '{}' COMMENT 'Mapping code_interne -> code_externe pour les journaux',

        -- Options specifiques au format (JSON)
        options_format JSON DEFAULT '{}' COMMENT 'Options specifiques au format',

        -- Statut
        actif BOOLEAN DEFAULT TRUE COMMENT 'Format actif',
        par_defaut BOOLEAN DEFAULT FALSE COMMENT 'Format par defaut',
        ordre_affichage INT DEFAULT 0 COMMENT 'Ordre d\\'affichage',

        -- Documentation
        description TEXT NULL COMMENT 'Description du format',
        documentation_url VARCHAR(500) NULL COMMENT 'URL documentation format',

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Index
        INDEX idx_actif (actif),
        INDEX idx_ordre_affichage (ordre_affichage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Configurations des formats d\\'export comptable (FEC, Sage, Ciel, etc.)'
    `);

    console.log('Table configurations_export_comptable created successfully!');

    // Inserer les configurations par defaut
    console.log('Inserting default export configurations...');

    for (const format of defaultFormats) {
      const colonnes = format.colonnes || 'NULL';
      const options = format.options_format || '{}';

      await connection.query(`
        INSERT INTO configurations_export_comptable
          (format, libelle, separateur, separateur_decimal, format_date, encodage, extension,
           inclure_entete, guillemets_texte, precision_decimale, colonnes, options_format,
           description, documentation_url, par_defaut, ordre_affichage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        format.format,
        format.libelle,
        format.separateur,
        format.separateur_decimal,
        format.format_date,
        format.encodage,
        format.extension,
        format.inclure_entete,
        format.guillemets_texte,
        format.precision_decimale,
        colonnes,
        options,
        format.description || null,
        format.documentation_url || null,
        format.par_defaut || false,
        format.ordre_affichage
      ]);
    }

    console.log(`${defaultFormats.length} default export configurations inserted!`);

  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('Dropping configurations_export_comptable table...');
    await connection.query('DROP TABLE IF EXISTS configurations_export_comptable');
    console.log('Table configurations_export_comptable dropped!');
  } catch (error) {
    console.error('Rollback error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration based on command line argument
const command = process.argv[2];
if (command === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node addConfigurationsExportComptable.js [up|down]');
  process.exit(1);
}
