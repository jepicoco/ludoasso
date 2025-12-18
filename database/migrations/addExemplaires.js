/**
 * Migration: Ajout des tables pour la gestion des exemplaires multiples
 *
 * Tables creees:
 * - exemplaires_jeux : Exemplaires physiques des jeux
 * - exemplaires_livres : Exemplaires physiques des livres
 * - exemplaires_films : Exemplaires physiques des films
 * - exemplaires_disques : Exemplaires physiques des disques
 *
 * Modifications:
 * - emprunts : Ajout des colonnes exemplaire_*_id
 *
 * Migration des donnees:
 * - Cree 1 exemplaire par article existant
 * - Lie les emprunts existants aux exemplaires
 *
 * Usage:
 *   node database/migrations/addExemplaires.js up
 *   node database/migrations/addExemplaires.js down
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

// Helper pour verifier si une table existe
async function tableExists(tableName) {
  const [results] = await sequelize.query(`SHOW TABLES LIKE '${tableName}'`);
  return results.length > 0;
}

// Helper pour verifier si une colonne existe
async function columnExists(tableName, columnName) {
  try {
    const [results] = await sequelize.query(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`);
    return results.length > 0;
  } catch (e) {
    return false;
  }
}

// Helper pour verifier si un index existe
async function indexExists(tableName, indexName) {
  try {
    const [results] = await sequelize.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = '${indexName}'`);
    return results.length > 0;
  } catch (e) {
    return false;
  }
}

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Exemplaires Multiples ===\n');

  // 1. Table exemplaires_jeux
  console.log('1. Creation table exemplaires_jeux...');
  if (await tableExists('exemplaires_jeux')) {
    console.log('   Table exemplaires_jeux existe deja.');
  } else {
    await queryInterface.createTable('exemplaires_jeux', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      jeu_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Code-barre unique de l\'exemplaire'
      },
      etat: {
        type: Sequelize.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
        allowNull: true,
        defaultValue: 'bon',
        comment: 'Etat physique de l\'exemplaire'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes specifiques a cet exemplaire'
      },
      emplacement_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'emplacements_jeux',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Emplacement physique de l\'exemplaire'
      },
      prix_achat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Prix d\'achat de cet exemplaire'
      },
      date_acquisition: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date d\'acquisition de cet exemplaire'
      },
      statut: {
        type: Sequelize.ENUM('disponible', 'emprunte', 'reserve', 'maintenance', 'perdu', 'archive'),
        allowNull: false,
        defaultValue: 'disponible',
        comment: 'Statut de l\'exemplaire'
      },
      numero_exemplaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Numero sequentiel par article (1, 2, 3...)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    console.log('   Table exemplaires_jeux creee.');
  }

  // Index pour exemplaires_jeux
  if (await tableExists('exemplaires_jeux')) {
    if (!(await indexExists('exemplaires_jeux', 'idx_jeu_id'))) {
      await sequelize.query(`ALTER TABLE exemplaires_jeux ADD INDEX idx_jeu_id (jeu_id)`);
      console.log('   Index idx_jeu_id ajoute.');
    }
    if (!(await indexExists('exemplaires_jeux', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE exemplaires_jeux ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('exemplaires_jeux', 'idx_emplacement'))) {
      await sequelize.query(`ALTER TABLE exemplaires_jeux ADD INDEX idx_emplacement (emplacement_id)`);
      console.log('   Index idx_emplacement ajoute.');
    }
  }

  // 2. Table exemplaires_livres
  console.log('2. Creation table exemplaires_livres...');
  if (await tableExists('exemplaires_livres')) {
    console.log('   Table exemplaires_livres existe deja.');
  } else {
    await queryInterface.createTable('exemplaires_livres', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      livre_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'livres',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Code-barre unique de l\'exemplaire'
      },
      etat: {
        type: Sequelize.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
        allowNull: true,
        defaultValue: 'bon',
        comment: 'Etat physique de l\'exemplaire'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes specifiques a cet exemplaire'
      },
      emplacement_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'emplacements_livres',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Emplacement physique de l\'exemplaire'
      },
      prix_achat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Prix d\'achat de cet exemplaire'
      },
      date_acquisition: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date d\'acquisition de cet exemplaire'
      },
      statut: {
        type: Sequelize.ENUM('disponible', 'emprunte', 'reserve', 'maintenance', 'perdu', 'archive'),
        allowNull: false,
        defaultValue: 'disponible',
        comment: 'Statut de l\'exemplaire'
      },
      numero_exemplaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Numero sequentiel par article (1, 2, 3...)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    console.log('   Table exemplaires_livres creee.');
  }

  // Index pour exemplaires_livres
  if (await tableExists('exemplaires_livres')) {
    if (!(await indexExists('exemplaires_livres', 'idx_livre_id'))) {
      await sequelize.query(`ALTER TABLE exemplaires_livres ADD INDEX idx_livre_id (livre_id)`);
      console.log('   Index idx_livre_id ajoute.');
    }
    if (!(await indexExists('exemplaires_livres', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE exemplaires_livres ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('exemplaires_livres', 'idx_emplacement'))) {
      await sequelize.query(`ALTER TABLE exemplaires_livres ADD INDEX idx_emplacement (emplacement_id)`);
      console.log('   Index idx_emplacement ajoute.');
    }
  }

  // 3. Table exemplaires_films
  console.log('3. Creation table exemplaires_films...');
  if (await tableExists('exemplaires_films')) {
    console.log('   Table exemplaires_films existe deja.');
  } else {
    await queryInterface.createTable('exemplaires_films', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      film_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'films',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Code-barre unique de l\'exemplaire'
      },
      etat: {
        type: Sequelize.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
        allowNull: true,
        defaultValue: 'bon',
        comment: 'Etat physique de l\'exemplaire'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes specifiques a cet exemplaire'
      },
      emplacement_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'emplacements_films',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Emplacement physique de l\'exemplaire'
      },
      prix_achat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Prix d\'achat de cet exemplaire'
      },
      date_acquisition: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date d\'acquisition de cet exemplaire'
      },
      statut: {
        type: Sequelize.ENUM('disponible', 'emprunte', 'reserve', 'maintenance', 'perdu', 'archive'),
        allowNull: false,
        defaultValue: 'disponible',
        comment: 'Statut de l\'exemplaire'
      },
      numero_exemplaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Numero sequentiel par article (1, 2, 3...)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    console.log('   Table exemplaires_films creee.');
  }

  // Index pour exemplaires_films
  if (await tableExists('exemplaires_films')) {
    if (!(await indexExists('exemplaires_films', 'idx_film_id'))) {
      await sequelize.query(`ALTER TABLE exemplaires_films ADD INDEX idx_film_id (film_id)`);
      console.log('   Index idx_film_id ajoute.');
    }
    if (!(await indexExists('exemplaires_films', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE exemplaires_films ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('exemplaires_films', 'idx_emplacement'))) {
      await sequelize.query(`ALTER TABLE exemplaires_films ADD INDEX idx_emplacement (emplacement_id)`);
      console.log('   Index idx_emplacement ajoute.');
    }
  }

  // 4. Table exemplaires_disques
  console.log('4. Creation table exemplaires_disques...');
  if (await tableExists('exemplaires_disques')) {
    console.log('   Table exemplaires_disques existe deja.');
  } else {
    await queryInterface.createTable('exemplaires_disques', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      disque_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'disques',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Code-barre unique de l\'exemplaire'
      },
      etat: {
        type: Sequelize.ENUM('neuf', 'tres_bon', 'bon', 'acceptable', 'mauvais'),
        allowNull: true,
        defaultValue: 'bon',
        comment: 'Etat physique de l\'exemplaire'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes specifiques a cet exemplaire'
      },
      emplacement_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'emplacements_disques',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'Emplacement physique de l\'exemplaire'
      },
      prix_achat: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Prix d\'achat de cet exemplaire'
      },
      date_acquisition: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date d\'acquisition de cet exemplaire'
      },
      statut: {
        type: Sequelize.ENUM('disponible', 'emprunte', 'reserve', 'maintenance', 'perdu', 'archive'),
        allowNull: false,
        defaultValue: 'disponible',
        comment: 'Statut de l\'exemplaire'
      },
      numero_exemplaire: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Numero sequentiel par article (1, 2, 3...)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    console.log('   Table exemplaires_disques creee.');
  }

  // Index pour exemplaires_disques
  if (await tableExists('exemplaires_disques')) {
    if (!(await indexExists('exemplaires_disques', 'idx_disque_id'))) {
      await sequelize.query(`ALTER TABLE exemplaires_disques ADD INDEX idx_disque_id (disque_id)`);
      console.log('   Index idx_disque_id ajoute.');
    }
    if (!(await indexExists('exemplaires_disques', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE exemplaires_disques ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('exemplaires_disques', 'idx_emplacement'))) {
      await sequelize.query(`ALTER TABLE exemplaires_disques ADD INDEX idx_emplacement (emplacement_id)`);
      console.log('   Index idx_emplacement ajoute.');
    }
  }

  // 5. Ajouter colonnes exemplaire_*_id a la table emprunts
  console.log('5. Ajout des colonnes exemplaire_*_id a la table emprunts...');

  if (await tableExists('emprunts')) {
    // exemplaire_jeu_id
    if (!(await columnExists('emprunts', 'exemplaire_jeu_id'))) {
      await sequelize.query(`
        ALTER TABLE emprunts
        ADD COLUMN exemplaire_jeu_id INT NULL
        AFTER jeu_id
      `);
      console.log('   Colonne exemplaire_jeu_id ajoutee.');

      // Ajouter FK si la table exemplaires existe
      if (await tableExists('exemplaires_jeux')) {
        await sequelize.query(`
          ALTER TABLE emprunts
          ADD CONSTRAINT fk_emprunt_exemplaire_jeu
          FOREIGN KEY (exemplaire_jeu_id) REFERENCES exemplaires_jeux(id)
          ON DELETE SET NULL
        `);
        console.log('   FK exemplaire_jeu_id ajoutee.');
      }
    }

    // exemplaire_livre_id
    if (!(await columnExists('emprunts', 'exemplaire_livre_id'))) {
      await sequelize.query(`
        ALTER TABLE emprunts
        ADD COLUMN exemplaire_livre_id INT NULL
        AFTER livre_id
      `);
      console.log('   Colonne exemplaire_livre_id ajoutee.');

      if (await tableExists('exemplaires_livres')) {
        await sequelize.query(`
          ALTER TABLE emprunts
          ADD CONSTRAINT fk_emprunt_exemplaire_livre
          FOREIGN KEY (exemplaire_livre_id) REFERENCES exemplaires_livres(id)
          ON DELETE SET NULL
        `);
        console.log('   FK exemplaire_livre_id ajoutee.');
      }
    }

    // exemplaire_film_id
    if (!(await columnExists('emprunts', 'exemplaire_film_id'))) {
      await sequelize.query(`
        ALTER TABLE emprunts
        ADD COLUMN exemplaire_film_id INT NULL
        AFTER film_id
      `);
      console.log('   Colonne exemplaire_film_id ajoutee.');

      if (await tableExists('exemplaires_films')) {
        await sequelize.query(`
          ALTER TABLE emprunts
          ADD CONSTRAINT fk_emprunt_exemplaire_film
          FOREIGN KEY (exemplaire_film_id) REFERENCES exemplaires_films(id)
          ON DELETE SET NULL
        `);
        console.log('   FK exemplaire_film_id ajoutee.');
      }
    }

    // exemplaire_disque_id (note: la colonne existante est cd_id)
    if (!(await columnExists('emprunts', 'exemplaire_disque_id'))) {
      await sequelize.query(`
        ALTER TABLE emprunts
        ADD COLUMN exemplaire_disque_id INT NULL
        AFTER cd_id
      `);
      console.log('   Colonne exemplaire_disque_id ajoutee.');

      if (await tableExists('exemplaires_disques')) {
        await sequelize.query(`
          ALTER TABLE emprunts
          ADD CONSTRAINT fk_emprunt_exemplaire_disque
          FOREIGN KEY (exemplaire_disque_id) REFERENCES exemplaires_disques(id)
          ON DELETE SET NULL
        `);
        console.log('   FK exemplaire_disque_id ajoutee.');
      }
    }
  }

  // 6. Migration des donnees existantes
  console.log('6. Migration des donnees existantes...');

  // 6.1 Creer un exemplaire pour chaque jeu existant
  if (await tableExists('exemplaires_jeux') && await tableExists('jeux')) {
    const [existingExemplaires] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_jeux');
    if (existingExemplaires[0].count === 0) {
      console.log('   Migration des jeux vers exemplaires_jeux...');
      // Adapter le statut 'reserve' si necessaire (jeux n'a pas ce statut)
      await sequelize.query(`
        INSERT INTO exemplaires_jeux (jeu_id, code_barre, etat, notes, emplacement_id, prix_achat, date_acquisition, statut, numero_exemplaire, created_at, updated_at)
        SELECT
          id,
          code_barre,
          etat,
          notes,
          emplacement_id,
          prix_achat,
          date_acquisition,
          CASE
            WHEN statut = 'reserve' THEN 'reserve'
            ELSE statut
          END,
          1,
          NOW(),
          NOW()
        FROM jeux
      `);
      const [count] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_jeux');
      console.log(`   ${count[0].count} exemplaires de jeux crees.`);
    } else {
      console.log('   Exemplaires de jeux deja existants, skip.');
    }
  }

  // 6.2 Creer un exemplaire pour chaque livre existant
  if (await tableExists('exemplaires_livres') && await tableExists('livres')) {
    const [existingExemplaires] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_livres');
    if (existingExemplaires[0].count === 0) {
      console.log('   Migration des livres vers exemplaires_livres...');
      await sequelize.query(`
        INSERT INTO exemplaires_livres (livre_id, code_barre, etat, notes, emplacement_id, prix_achat, date_acquisition, statut, numero_exemplaire, created_at, updated_at)
        SELECT
          id,
          code_barre,
          etat,
          notes,
          emplacement_id,
          prix_achat,
          date_acquisition,
          CASE
            WHEN statut = 'reserve' THEN 'reserve'
            ELSE statut
          END,
          1,
          NOW(),
          NOW()
        FROM livres
      `);
      const [count] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_livres');
      console.log(`   ${count[0].count} exemplaires de livres crees.`);
    } else {
      console.log('   Exemplaires de livres deja existants, skip.');
    }
  }

  // 6.3 Creer un exemplaire pour chaque film existant
  if (await tableExists('exemplaires_films') && await tableExists('films')) {
    const [existingExemplaires] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_films');
    if (existingExemplaires[0].count === 0) {
      console.log('   Migration des films vers exemplaires_films...');
      await sequelize.query(`
        INSERT INTO exemplaires_films (film_id, code_barre, etat, notes, emplacement_id, prix_achat, date_acquisition, statut, numero_exemplaire, created_at, updated_at)
        SELECT
          id,
          code_barre,
          etat,
          notes,
          emplacement_id,
          prix_achat,
          date_acquisition,
          CASE
            WHEN statut = 'reserve' THEN 'reserve'
            ELSE statut
          END,
          1,
          NOW(),
          NOW()
        FROM films
      `);
      const [count] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_films');
      console.log(`   ${count[0].count} exemplaires de films crees.`);
    } else {
      console.log('   Exemplaires de films deja existants, skip.');
    }
  }

  // 6.4 Creer un exemplaire pour chaque disque existant
  if (await tableExists('exemplaires_disques') && await tableExists('disques')) {
    const [existingExemplaires] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_disques');
    if (existingExemplaires[0].count === 0) {
      console.log('   Migration des disques vers exemplaires_disques...');
      await sequelize.query(`
        INSERT INTO exemplaires_disques (disque_id, code_barre, etat, notes, emplacement_id, prix_achat, date_acquisition, statut, numero_exemplaire, created_at, updated_at)
        SELECT
          id,
          code_barre,
          etat,
          notes,
          emplacement_id,
          prix_achat,
          date_acquisition,
          CASE
            WHEN statut = 'reserve' THEN 'reserve'
            ELSE statut
          END,
          1,
          NOW(),
          NOW()
        FROM disques
      `);
      const [count] = await sequelize.query('SELECT COUNT(*) as count FROM exemplaires_disques');
      console.log(`   ${count[0].count} exemplaires de disques crees.`);
    } else {
      console.log('   Exemplaires de disques deja existants, skip.');
    }
  }

  // 6.5 Lier les emprunts existants aux exemplaires
  console.log('   Liaison des emprunts existants aux exemplaires...');

  // Emprunts de jeux
  if (await columnExists('emprunts', 'exemplaire_jeu_id') && await tableExists('exemplaires_jeux')) {
    await sequelize.query(`
      UPDATE emprunts e
      INNER JOIN exemplaires_jeux ex ON ex.jeu_id = e.jeu_id AND ex.numero_exemplaire = 1
      SET e.exemplaire_jeu_id = ex.id
      WHERE e.jeu_id IS NOT NULL AND e.exemplaire_jeu_id IS NULL
    `);
    const [count] = await sequelize.query('SELECT COUNT(*) as count FROM emprunts WHERE exemplaire_jeu_id IS NOT NULL');
    console.log(`   ${count[0].count} emprunts de jeux lies.`);
  }

  // Emprunts de livres
  if (await columnExists('emprunts', 'exemplaire_livre_id') && await tableExists('exemplaires_livres')) {
    await sequelize.query(`
      UPDATE emprunts e
      INNER JOIN exemplaires_livres ex ON ex.livre_id = e.livre_id AND ex.numero_exemplaire = 1
      SET e.exemplaire_livre_id = ex.id
      WHERE e.livre_id IS NOT NULL AND e.exemplaire_livre_id IS NULL
    `);
    const [count] = await sequelize.query('SELECT COUNT(*) as count FROM emprunts WHERE exemplaire_livre_id IS NOT NULL');
    console.log(`   ${count[0].count} emprunts de livres lies.`);
  }

  // Emprunts de films
  if (await columnExists('emprunts', 'exemplaire_film_id') && await tableExists('exemplaires_films')) {
    await sequelize.query(`
      UPDATE emprunts e
      INNER JOIN exemplaires_films ex ON ex.film_id = e.film_id AND ex.numero_exemplaire = 1
      SET e.exemplaire_film_id = ex.id
      WHERE e.film_id IS NOT NULL AND e.exemplaire_film_id IS NULL
    `);
    const [count] = await sequelize.query('SELECT COUNT(*) as count FROM emprunts WHERE exemplaire_film_id IS NOT NULL');
    console.log(`   ${count[0].count} emprunts de films lies.`);
  }

  // Emprunts de disques (cd_id)
  if (await columnExists('emprunts', 'exemplaire_disque_id') && await tableExists('exemplaires_disques')) {
    await sequelize.query(`
      UPDATE emprunts e
      INNER JOIN exemplaires_disques ex ON ex.disque_id = e.cd_id AND ex.numero_exemplaire = 1
      SET e.exemplaire_disque_id = ex.id
      WHERE e.cd_id IS NOT NULL AND e.exemplaire_disque_id IS NULL
    `);
    const [count] = await sequelize.query('SELECT COUNT(*) as count FROM emprunts WHERE exemplaire_disque_id IS NOT NULL');
    console.log(`   ${count[0].count} emprunts de disques lies.`);
  }

  console.log('\n=== Migration terminee avec succes ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback Exemplaires Multiples ===\n');

  // 1. Supprimer les FK sur emprunts
  console.log('1. Suppression des FK sur emprunts...');
  try {
    await sequelize.query('ALTER TABLE emprunts DROP FOREIGN KEY fk_emprunt_exemplaire_jeu');
    console.log('   FK fk_emprunt_exemplaire_jeu supprimee.');
  } catch (e) { /* ignore */ }

  try {
    await sequelize.query('ALTER TABLE emprunts DROP FOREIGN KEY fk_emprunt_exemplaire_livre');
    console.log('   FK fk_emprunt_exemplaire_livre supprimee.');
  } catch (e) { /* ignore */ }

  try {
    await sequelize.query('ALTER TABLE emprunts DROP FOREIGN KEY fk_emprunt_exemplaire_film');
    console.log('   FK fk_emprunt_exemplaire_film supprimee.');
  } catch (e) { /* ignore */ }

  try {
    await sequelize.query('ALTER TABLE emprunts DROP FOREIGN KEY fk_emprunt_exemplaire_disque');
    console.log('   FK fk_emprunt_exemplaire_disque supprimee.');
  } catch (e) { /* ignore */ }

  // 2. Supprimer les colonnes exemplaire_*_id de emprunts
  console.log('2. Suppression des colonnes exemplaire_*_id de emprunts...');
  const columnsToRemove = ['exemplaire_jeu_id', 'exemplaire_livre_id', 'exemplaire_film_id', 'exemplaire_disque_id'];
  for (const col of columnsToRemove) {
    try {
      await sequelize.query(`ALTER TABLE emprunts DROP COLUMN ${col}`);
      console.log(`   Colonne ${col} supprimee.`);
    } catch (e) {
      console.log(`   Skip ${col}: ${e.message}`);
    }
  }

  // 3. Supprimer les tables exemplaires
  console.log('3. Suppression des tables exemplaires...');
  const tablesToDrop = ['exemplaires_disques', 'exemplaires_films', 'exemplaires_livres', 'exemplaires_jeux'];
  for (const table of tablesToDrop) {
    try {
      await queryInterface.dropTable(table);
      console.log(`   Table ${table} supprimee.`);
    } catch (e) {
      console.log(`   Skip ${table}: ${e.message}`);
    }
  }

  console.log('\n=== Rollback termine ===');
}

// Export pour le migration runner
module.exports = { up, down };

// Execution directe si appele en ligne de commande
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      await sequelize.authenticate();
      console.log('Connexion base de donnees etablie.\n');

      if (command === 'up') {
        await up();
      } else if (command === 'down') {
        await down();
      } else {
        console.log('Usage: node addExemplaires.js [up|down]');
      }
    } catch (error) {
      console.error('Erreur migration:', error);
      process.exit(1);
    } finally {
      await sequelize.close();
    }
  })();
}
