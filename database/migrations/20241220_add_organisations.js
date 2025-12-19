/**
 * Migration: Creation de la table organisations
 *
 * Table racine pour la gestion multi-organisations.
 * Une organisation peut avoir plusieurs structures (bibliotheque, ludotheque, etc.)
 */

async function up(connection) {
  // Verifier si la table existe deja
  const [tables] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organisations'`
  );

  if (tables.length === 0) {
    await connection.query(`
      CREATE TABLE organisations (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Identification
        nom VARCHAR(200) NOT NULL COMMENT 'Nom officiel de l\\'organisation',
        nom_court VARCHAR(50) NULL COMMENT 'Nom abrege pour affichage compact',
        type_organisation ENUM('association', 'collectivite', 'entreprise', 'autre') DEFAULT 'association' COMMENT 'Type juridique',

        -- Identifiants legaux
        siret VARCHAR(14) NULL COMMENT 'Numero SIRET (14 chiffres)',
        siren VARCHAR(9) NULL COMMENT 'Numero SIREN (9 premiers chiffres du SIRET)',
        rna VARCHAR(10) NULL COMMENT 'Numero RNA pour associations (W + 9 chiffres)',
        code_ape VARCHAR(6) NULL COMMENT 'Code APE/NAF (ex: 9499Z)',
        numero_tva VARCHAR(20) NULL COMMENT 'Numero TVA intracommunautaire',

        -- Associations specifiques
        numero_agrement VARCHAR(50) NULL COMMENT 'Numero agrement jeunesse/sport ou autre',
        prefecture_declaration VARCHAR(100) NULL COMMENT 'Prefecture de declaration (associations)',
        date_publication_jo DATE NULL COMMENT 'Date publication au Journal Officiel',
        date_creation DATE NULL COMMENT 'Date de creation/immatriculation',

        -- Collectivites specifiques
        code_insee VARCHAR(5) NULL COMMENT 'Code INSEE commune (collectivites)',

        -- Adresse du siege
        adresse TEXT NULL COMMENT 'Adresse complete du siege',
        code_postal VARCHAR(10) NULL,
        ville VARCHAR(100) NULL,
        pays VARCHAR(2) DEFAULT 'FR' COMMENT 'Code pays ISO 3166-1 alpha-2',

        -- Contact (191 chars max pour compatibilite index MySQL utf8mb4)
        email VARCHAR(191) NULL COMMENT 'Email principal de l\\'organisation',
        telephone VARCHAR(20) NULL,
        site_web VARCHAR(191) NULL,

        -- Representant legal
        representant_nom VARCHAR(100) NULL COMMENT 'Nom du representant legal',
        representant_fonction VARCHAR(50) NULL COMMENT 'Fonction (President, Maire, Directeur...)',
        representant_email VARCHAR(191) NULL,

        -- Comptabilite
        regime_tva ENUM('assujetti', 'non_assujetti', 'franchise') DEFAULT 'non_assujetti' COMMENT 'Regime TVA applicable',
        debut_exercice_jour INT DEFAULT 1 COMMENT 'Jour debut exercice comptable (1-31)',
        debut_exercice_mois INT DEFAULT 1 COMMENT 'Mois debut exercice comptable (1-12)',
        code_comptable VARCHAR(20) NULL COMMENT 'Code pour exports comptables',

        -- Identite visuelle
        logo_url TEXT NULL COMMENT 'URL du logo',
        couleur_primaire VARCHAR(7) DEFAULT '#007bff' COMMENT 'Couleur principale (hex)',

        -- Connecteurs communication (references aux configurations)
        configuration_email_id INT NULL COMMENT 'FK vers configurations_email pour SMTP',
        configuration_sms_id INT NULL COMMENT 'FK vers configurations_sms',

        -- Statut
        actif TINYINT(1) DEFAULT 1,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('  Table organisations creee');
  } else {
    console.log('  Table organisations existe deja');
  }

  // Ajouter organisation_id a la table structures si elle existe
  const [structuresTable] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'structures'`
  );

  if (structuresTable.length > 0) {
    // Verifier si la colonne existe deja
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'structures' AND COLUMN_NAME = 'organisation_id'`
    );

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE structures
        ADD COLUMN organisation_id INT NULL COMMENT 'FK vers organisations - organisation parente'
      `);
      console.log('  Colonne organisation_id ajoutee a structures');

      // Ajouter la FK
      try {
        await connection.query(`
          ALTER TABLE structures
          ADD CONSTRAINT fk_structures_organisation
          FOREIGN KEY (organisation_id) REFERENCES organisations(id)
          ON UPDATE CASCADE ON DELETE SET NULL
        `);
        console.log('  FK structures.organisation_id ajoutee');
      } catch (e) {
        console.log('  FK deja existante ou erreur:', e.message);
      }
    }
  }

  // Ajouter un index simple sur actif
  try {
    await connection.query(`
      CREATE INDEX idx_organisations_actif ON organisations(actif)
    `);
  } catch (e) {
    // Index peut deja exister
  }
}

async function down(connection) {
  // Supprimer la FK et colonne organisation_id de structures
  const [structuresTable] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'structures'`
  );

  if (structuresTable.length > 0) {
    try {
      await connection.query(`
        ALTER TABLE structures DROP FOREIGN KEY fk_structures_organisation
      `);
    } catch (e) {}

    try {
      await connection.query(`
        ALTER TABLE structures DROP COLUMN organisation_id
      `);
    } catch (e) {}
  }

  // Supprimer la table organisations
  await connection.query(`DROP TABLE IF EXISTS organisations`);
  console.log('  Table organisations supprimee');
}

module.exports = { up, down };
