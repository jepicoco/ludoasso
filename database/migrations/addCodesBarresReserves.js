/**
 * Migration: Ajout des tables pour la gestion des codes-barres reserves
 *
 * Tables creees:
 * - lots_codes_barres : Historique des lots imprimes
 * - parametres_codes_barres : Configuration du format par module
 * - codes_barres_utilisateurs : Codes reserves pour utilisateurs
 * - codes_barres_jeux : Codes reserves pour jeux
 * - codes_barres_livres : Codes reserves pour livres
 * - codes_barres_films : Codes reserves pour films
 * - codes_barres_disques : Codes reserves pour disques
 *
 * Usage:
 *   node database/migrations/addCodesBarresReserves.js up
 *   node database/migrations/addCodesBarresReserves.js down
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

  console.log('=== Migration Codes-Barres Reserves ===\n');

  // 1. Table lots_codes_barres (doit etre creee avant les tables de codes pour les FK)
  console.log('1. Creation table lots_codes_barres...');
  if (await tableExists('lots_codes_barres')) {
    console.log('   Table lots_codes_barres existe deja.');
  } else {
    await queryInterface.createTable('lots_codes_barres', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      module: {
        type: Sequelize.ENUM('utilisateur', 'jeu', 'livre', 'film', 'disque'),
        allowNull: false
      },
      quantite: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      code_debut: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      code_fin: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      cree_par: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'utilisateurs',
          key: 'id'
        }
      },
      date_creation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_impression: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nb_reimpressions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      nb_utilises: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      nb_annules: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      statut: {
        type: Sequelize.ENUM('actif', 'annule', 'complet'),
        allowNull: false,
        defaultValue: 'actif'
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
    console.log('   Table lots_codes_barres creee.');
  }

  // Index pour lots_codes_barres
  if (await tableExists('lots_codes_barres')) {
    if (!(await indexExists('lots_codes_barres', 'idx_module'))) {
      await sequelize.query(`ALTER TABLE lots_codes_barres ADD INDEX idx_module (module)`);
      console.log('   Index idx_module ajoute.');
    }
    if (!(await indexExists('lots_codes_barres', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE lots_codes_barres ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('lots_codes_barres', 'idx_date_creation'))) {
      await sequelize.query(`ALTER TABLE lots_codes_barres ADD INDEX idx_date_creation (date_creation)`);
      console.log('   Index idx_date_creation ajoute.');
    }
  }

  // 2. Table parametres_codes_barres
  console.log('2. Creation table parametres_codes_barres...');
  if (await tableExists('parametres_codes_barres')) {
    console.log('   Table parametres_codes_barres existe deja.');
  } else {
    await queryInterface.createTable('parametres_codes_barres', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      module: {
        type: Sequelize.ENUM('utilisateur', 'jeu', 'livre', 'film', 'disque'),
        allowNull: false,
        unique: true
      },
      format_pattern: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '{PREFIX}{NUMERO_SEQUENCE_8}',
        comment: 'Pattern avec tokens: {PREFIX}, {ANNEE_LONGUE}, {ANNEE_COURTE}, {MOIS_LONG}, {MOIS_COURT}, {JOUR_LONG}, {JOUR_COURT}, {NUMERO_SEQUENCE_4}, {NUMERO_SEQUENCE_6}, {NUMERO_SEQUENCE_8}, {NUMERO_SEQUENCE_10}'
      },
      prefix: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'USA',
        comment: 'Prefixe du code-barre'
      },
      sequence_reset: {
        type: Sequelize.ENUM('never', 'yearly', 'monthly', 'daily'),
        allowNull: false,
        defaultValue: 'never',
        comment: 'Periode de remise a zero de la sequence'
      },
      current_sequence: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Numero de sequence courant'
      },
      current_period: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Periode courante: 2025, 202512, 20251209'
      },
      griller_annules: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si true, les codes annules sont grilles definitivement'
      },
      format_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si true, le format ne peut plus etre modifie'
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
    console.log('   Table parametres_codes_barres creee.');
  }

  // Insertion des parametres par defaut
  if (await tableExists('parametres_codes_barres')) {
    const [rows] = await sequelize.query('SELECT COUNT(*) as count FROM parametres_codes_barres');
    if (rows[0].count === 0) {
      await sequelize.query(`
        INSERT INTO parametres_codes_barres (module, prefix, format_pattern)
        VALUES
          ('utilisateur', 'USA', '{PREFIX}{NUMERO_SEQUENCE_8}'),
          ('jeu', 'JEU', '{PREFIX}{NUMERO_SEQUENCE_8}'),
          ('livre', 'LIV', '{PREFIX}{NUMERO_SEQUENCE_8}'),
          ('film', 'FLM', '{PREFIX}{NUMERO_SEQUENCE_8}'),
          ('disque', 'DSQ', '{PREFIX}{NUMERO_SEQUENCE_8}')
      `);
      console.log('   Parametres par defaut inseres.');
    }
  }

  // 3. Table codes_barres_utilisateurs
  console.log('3. Creation table codes_barres_utilisateurs...');
  if (await tableExists('codes_barres_utilisateurs')) {
    console.log('   Table codes_barres_utilisateurs existe deja.');
  } else {
    await queryInterface.createTable('codes_barres_utilisateurs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lots_codes_barres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      statut: {
        type: Sequelize.ENUM('reserve', 'utilise', 'annule', 'grille'),
        allowNull: false,
        defaultValue: 'reserve'
      },
      utilisateur_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'utilisateurs',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      date_reservation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_utilisation: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_annulation: {
        type: Sequelize.DATE,
        allowNull: true
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
    console.log('   Table codes_barres_utilisateurs creee.');
  }

  // Index pour codes_barres_utilisateurs
  if (await tableExists('codes_barres_utilisateurs')) {
    if (!(await indexExists('codes_barres_utilisateurs', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE codes_barres_utilisateurs ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('codes_barres_utilisateurs', 'idx_lot'))) {
      await sequelize.query(`ALTER TABLE codes_barres_utilisateurs ADD INDEX idx_lot (lot_id)`);
      console.log('   Index idx_lot ajoute.');
    }
  }

  // 4. Table codes_barres_jeux
  console.log('4. Creation table codes_barres_jeux...');
  if (await tableExists('codes_barres_jeux')) {
    console.log('   Table codes_barres_jeux existe deja.');
  } else {
    await queryInterface.createTable('codes_barres_jeux', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lots_codes_barres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      statut: {
        type: Sequelize.ENUM('reserve', 'utilise', 'annule', 'grille'),
        allowNull: false,
        defaultValue: 'reserve'
      },
      jeu_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'jeux',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      date_reservation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_utilisation: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_annulation: {
        type: Sequelize.DATE,
        allowNull: true
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
    console.log('   Table codes_barres_jeux creee.');
  }

  // Index pour codes_barres_jeux
  if (await tableExists('codes_barres_jeux')) {
    if (!(await indexExists('codes_barres_jeux', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE codes_barres_jeux ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('codes_barres_jeux', 'idx_lot'))) {
      await sequelize.query(`ALTER TABLE codes_barres_jeux ADD INDEX idx_lot (lot_id)`);
      console.log('   Index idx_lot ajoute.');
    }
  }

  // 5. Table codes_barres_livres
  console.log('5. Creation table codes_barres_livres...');
  if (await tableExists('codes_barres_livres')) {
    console.log('   Table codes_barres_livres existe deja.');
  } else {
    await queryInterface.createTable('codes_barres_livres', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lots_codes_barres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      statut: {
        type: Sequelize.ENUM('reserve', 'utilise', 'annule', 'grille'),
        allowNull: false,
        defaultValue: 'reserve'
      },
      livre_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'livres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      date_reservation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_utilisation: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_annulation: {
        type: Sequelize.DATE,
        allowNull: true
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
    console.log('   Table codes_barres_livres creee.');
  }

  // Index pour codes_barres_livres
  if (await tableExists('codes_barres_livres')) {
    if (!(await indexExists('codes_barres_livres', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE codes_barres_livres ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('codes_barres_livres', 'idx_lot'))) {
      await sequelize.query(`ALTER TABLE codes_barres_livres ADD INDEX idx_lot (lot_id)`);
      console.log('   Index idx_lot ajoute.');
    }
  }

  // 6. Table codes_barres_films
  console.log('6. Creation table codes_barres_films...');
  if (await tableExists('codes_barres_films')) {
    console.log('   Table codes_barres_films existe deja.');
  } else {
    await queryInterface.createTable('codes_barres_films', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lots_codes_barres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      statut: {
        type: Sequelize.ENUM('reserve', 'utilise', 'annule', 'grille'),
        allowNull: false,
        defaultValue: 'reserve'
      },
      film_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'films',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      date_reservation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_utilisation: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_annulation: {
        type: Sequelize.DATE,
        allowNull: true
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
    console.log('   Table codes_barres_films creee.');
  }

  // Index pour codes_barres_films
  if (await tableExists('codes_barres_films')) {
    if (!(await indexExists('codes_barres_films', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE codes_barres_films ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('codes_barres_films', 'idx_lot'))) {
      await sequelize.query(`ALTER TABLE codes_barres_films ADD INDEX idx_lot (lot_id)`);
      console.log('   Index idx_lot ajoute.');
    }
  }

  // 7. Table codes_barres_disques
  console.log('7. Creation table codes_barres_disques...');
  if (await tableExists('codes_barres_disques')) {
    console.log('   Table codes_barres_disques existe deja.');
  } else {
    await queryInterface.createTable('codes_barres_disques', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code_barre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'lots_codes_barres',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      statut: {
        type: Sequelize.ENUM('reserve', 'utilise', 'annule', 'grille'),
        allowNull: false,
        defaultValue: 'reserve'
      },
      disque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'disques',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      date_reservation: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      date_utilisation: {
        type: Sequelize.DATE,
        allowNull: true
      },
      date_annulation: {
        type: Sequelize.DATE,
        allowNull: true
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
    console.log('   Table codes_barres_disques creee.');
  }

  // Index pour codes_barres_disques
  if (await tableExists('codes_barres_disques')) {
    if (!(await indexExists('codes_barres_disques', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE codes_barres_disques ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('codes_barres_disques', 'idx_lot'))) {
      await sequelize.query(`ALTER TABLE codes_barres_disques ADD INDEX idx_lot (lot_id)`);
      console.log('   Index idx_lot ajoute.');
    }
  }

  console.log('\n=== Migration terminee avec succes ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback Codes-Barres Reserves ===\n');

  // Supprimer les tables dans l'ordre inverse (contraintes FK)
  const tablesToDrop = [
    'codes_barres_disques',
    'codes_barres_films',
    'codes_barres_livres',
    'codes_barres_jeux',
    'codes_barres_utilisateurs',
    'parametres_codes_barres',
    'lots_codes_barres'
  ];

  for (const table of tablesToDrop) {
    try {
      await queryInterface.dropTable(table);
      console.log(`Table ${table} supprimee`);
    } catch (e) {
      console.log(`Skip ${table}: ${e.message}`);
    }
  }

  console.log('\n=== Rollback termine ===');
}

async function main() {
  const command = process.argv[2];

  try {
    await sequelize.authenticate();
    console.log('Connexion base de donnees etablie.\n');

    if (command === 'up') {
      await up();
    } else if (command === 'down') {
      await down();
    } else {
      console.log('Usage: node addCodesBarresReserves.js [up|down]');
    }
  } catch (error) {
    console.error('Erreur migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
