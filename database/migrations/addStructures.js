/**
 * Migration: Ajout du systeme multi-structures V0.9
 *
 * Nouvelles tables:
 * - structures : Entites operationnelles (Bibliotheque, Ludotheque...)
 * - parametres_front_structure : Config frontend par structure
 * - groupes_frontend : Groupement de structures pour frontend public
 * - groupe_frontend_structures : Liaison groupe-structure
 * - utilisateur_structures : Acces utilisateur par structure
 *
 * Modifications:
 * - Ajout structure_id sur sites, tarifs_cotisation, cotisations, caisses,
 *   ecritures_comptables, emprunts, jeux, livres, films, disques
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../../backend/models');

async function up() {
  console.log('=== Migration Multi-Structures V0.9 ===\n');

  // 1. Table structures
  console.log('1. Creation table structures...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS structures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(20) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        organisation_nom VARCHAR(200),
        siret VARCHAR(14),
        adresse TEXT,
        telephone VARCHAR(20),
        email VARCHAR(255),
        modules_actifs JSON,
        couleur VARCHAR(7) DEFAULT '#007bff',
        icone VARCHAR(50) DEFAULT 'building',
        code_comptable VARCHAR(20),
        section_analytique_id INT NULL,
        actif TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_code (code),
        INDEX idx_actif (actif),
        CONSTRAINT fk_structures_section_analytique
          FOREIGN KEY (section_analytique_id) REFERENCES sections_analytiques(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   OK table structures creee');
  } catch (e) {
    if (e.original?.errno === 1050) {
      console.log('   Table structures existe deja');
    } else {
      throw e;
    }
  }

  // 2. Table parametres_front_structure
  console.log('2. Creation table parametres_front_structure...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS parametres_front_structure (
        id INT PRIMARY KEY AUTO_INCREMENT,
        structure_id INT NOT NULL,
        theme_code VARCHAR(50) DEFAULT 'default',
        couleur_primaire VARCHAR(7),
        couleur_secondaire VARCHAR(7),
        logo_url VARCHAR(500),
        modules_visibles JSON,
        permettre_reservations TINYINT(1) NOT NULL DEFAULT 1,
        permettre_prolongations TINYINT(1) NOT NULL DEFAULT 1,
        max_prolongations INT NOT NULL DEFAULT 1,
        delai_prolongation_jours INT NOT NULL DEFAULT 14,
        limite_emprunts_defaut INT NOT NULL DEFAULT 5,
        limite_emprunts_par_collection JSON,
        message_accueil TEXT,
        conditions_utilisation TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_structure (structure_id),
        CONSTRAINT fk_parametres_front_structure
          FOREIGN KEY (structure_id) REFERENCES structures(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   OK table parametres_front_structure creee');
  } catch (e) {
    if (e.original?.errno === 1050) {
      console.log('   Table parametres_front_structure existe deja');
    } else {
      throw e;
    }
  }

  // 3. Table groupes_frontend
  console.log('3. Creation table groupes_frontend...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS groupes_frontend (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        slug VARCHAR(100),
        domaine_personnalise VARCHAR(255),
        theme_code VARCHAR(50) DEFAULT 'default',
        logo_url VARCHAR(500),
        actif TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_code (code),
        UNIQUE KEY unique_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   OK table groupes_frontend creee');
  } catch (e) {
    if (e.original?.errno === 1050) {
      console.log('   Table groupes_frontend existe deja');
    } else {
      throw e;
    }
  }

  // 4. Table groupe_frontend_structures
  console.log('4. Creation table groupe_frontend_structures...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS groupe_frontend_structures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        groupe_frontend_id INT NOT NULL,
        structure_id INT NOT NULL,
        ordre_affichage INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_groupe_structure (groupe_frontend_id, structure_id),
        CONSTRAINT fk_groupe_frontend_structures_groupe
          FOREIGN KEY (groupe_frontend_id) REFERENCES groupes_frontend(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_groupe_frontend_structures_structure
          FOREIGN KEY (structure_id) REFERENCES structures(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   OK table groupe_frontend_structures creee');
  } catch (e) {
    if (e.original?.errno === 1050) {
      console.log('   Table groupe_frontend_structures existe deja');
    } else {
      throw e;
    }
  }

  // 5. Table utilisateur_structures
  console.log('5. Creation table utilisateur_structures...');
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS utilisateur_structures (
        id INT PRIMARY KEY AUTO_INCREMENT,
        utilisateur_id INT NOT NULL,
        structure_id INT NOT NULL,
        role_structure ENUM('usager','benevole','gestionnaire','comptable','administrateur') NULL,
        actif TINYINT(1) NOT NULL DEFAULT 1,
        date_debut DATE,
        date_fin DATE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_utilisateur_structure (utilisateur_id, structure_id),
        INDEX idx_structure (structure_id),
        INDEX idx_utilisateur (utilisateur_id),
        CONSTRAINT fk_utilisateur_structures_utilisateur
          FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_utilisateur_structures_structure
          FOREIGN KEY (structure_id) REFERENCES structures(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   OK table utilisateur_structures creee');
  } catch (e) {
    if (e.original?.errno === 1050) {
      console.log('   Table utilisateur_structures existe deja');
    } else {
      throw e;
    }
  }

  // 6. Ajout structure_id aux tables existantes
  console.log('6. Ajout colonne structure_id aux tables existantes...');

  const tablesToModify = [
    'sites',
    'tarifs_cotisation',
    'cotisations',
    'caisses',
    'ecritures_comptables',
    'emprunts',
    'jeux',
    'livres',
    'films',
    'disques'
  ];

  for (const table of tablesToModify) {
    try {
      // Verifier si la colonne existe deja
      const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE 'structure_id'`);
      if (columns.length === 0) {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN structure_id INT NULL`);
        console.log(`   OK ${table}.structure_id ajoutee`);

        // Ajouter index
        try {
          await sequelize.query(`CREATE INDEX idx_${table}_structure ON ${table}(structure_id)`);
        } catch (idxErr) {
          if (idxErr.original?.errno !== 1061) throw idxErr;
        }
      } else {
        console.log(`   ${table}.structure_id existe deja`);
      }
    } catch (e) {
      if (e.original?.errno === 1060) {
        console.log(`   ${table}.structure_id existe deja`);
      } else if (e.original?.errno === 1146) {
        console.log(`   Table ${table} n'existe pas, ignoree`);
      } else {
        throw e;
      }
    }
  }

  // 7. Creer structure par defaut et migrer donnees existantes
  console.log('7. Creation structure par defaut et migration donnees...');

  // Verifier s'il existe deja des structures
  const [existingStructures] = await sequelize.query(`SELECT COUNT(*) as count FROM structures`);

  if (existingStructures[0].count === 0) {
    // Creer structure par defaut
    await sequelize.query(`
      INSERT INTO structures (code, nom, description, modules_actifs, actif, created_at, updated_at)
      VALUES ('principale', 'Structure principale', 'Structure par defaut', '["jeux","livres","films","disques"]', 1, NOW(), NOW())
    `);
    console.log('   OK Structure principale creee');

    // Recuperer l'ID
    const [[defaultStructure]] = await sequelize.query(`SELECT id FROM structures WHERE code = 'principale'`);
    const structureId = defaultStructure.id;

    // Mettre a jour les tables existantes
    for (const table of tablesToModify) {
      try {
        const [result] = await sequelize.query(`UPDATE ${table} SET structure_id = ? WHERE structure_id IS NULL`, {
          replacements: [structureId]
        });
        console.log(`   OK ${table} mis a jour`);
      } catch (e) {
        if (e.original?.errno !== 1146) {
          console.log(`   Erreur ${table}: ${e.message}`);
        }
      }
    }

    // Creer parametres frontend pour la structure par defaut
    await sequelize.query(`
      INSERT INTO parametres_front_structure (structure_id, theme_code, modules_visibles, created_at, updated_at)
      VALUES (?, 'default', '["catalogue","reservations","emprunts","prolongations"]', NOW(), NOW())
    `, { replacements: [structureId] });
    console.log('   OK Parametres frontend crees');

    // Creer groupe frontend par defaut
    await sequelize.query(`
      INSERT INTO groupes_frontend (code, nom, slug, actif, created_at, updated_at)
      VALUES ('default', 'Site principal', 'principal', 1, NOW(), NOW())
    `);
    const [[defaultGroupe]] = await sequelize.query(`SELECT id FROM groupes_frontend WHERE code = 'default'`);

    // Lier structure au groupe
    await sequelize.query(`
      INSERT INTO groupe_frontend_structures (groupe_frontend_id, structure_id, ordre_affichage, created_at)
      VALUES (?, ?, 0, NOW())
    `, { replacements: [defaultGroupe.id, structureId] });
    console.log('   OK Groupe frontend cree et lie');

    // Donner acces a tous les utilisateurs staff
    await sequelize.query(`
      INSERT INTO utilisateur_structures (utilisateur_id, structure_id, actif, created_at, updated_at)
      SELECT id, ?, 1, NOW(), NOW() FROM utilisateurs WHERE role != 'usager'
    `, { replacements: [structureId] });
    console.log('   OK Acces staff configures');

  } else {
    console.log('   Structures existantes detectees, migration donnees ignoree');
  }

  console.log('\n=== Migration Multi-Structures terminee avec succes ===');
}

async function down() {
  console.log('=== Rollback Multi-Structures V0.9 ===\n');

  // Supprimer colonnes structure_id
  const tablesToModify = [
    'sites', 'tarifs_cotisation', 'cotisations', 'caisses',
    'ecritures_comptables', 'emprunts', 'jeux', 'livres', 'films', 'disques'
  ];

  for (const table of tablesToModify) {
    try {
      await sequelize.query(`ALTER TABLE ${table} DROP COLUMN structure_id`);
      console.log(`   ${table}.structure_id supprimee`);
    } catch (e) {
      console.log(`   ${table}: ${e.message}`);
    }
  }

  // Supprimer tables dans l'ordre inverse (FK)
  const tables = [
    'utilisateur_structures',
    'groupe_frontend_structures',
    'parametres_front_structure',
    'groupes_frontend',
    'structures'
  ];

  for (const table of tables) {
    try {
      await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
      console.log(`   Table ${table} supprimee`);
    } catch (e) {
      console.log(`   ${table}: ${e.message}`);
    }
  }

  console.log('\n=== Rollback termine ===');
}

// Export pour migrate.js
module.exports = { up, down };

// Execution directe
if (require.main === module) {
  const command = process.argv[2];
  (async () => {
    try {
      if (command === 'down') {
        await down();
      } else {
        await up();
      }
      process.exit(0);
    } catch (error) {
      console.error('Erreur migration:', error);
      process.exit(1);
    }
  })();
}
