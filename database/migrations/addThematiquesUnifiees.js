/**
 * Migration: Ajout des tables pour les thematiques unifiees et l'enrichissement IA
 *
 * Tables creees:
 * - thematiques : themes/mecanismes/ambiances extraits par IA
 * - thematiques_alias : alias pour deduplication automatique
 * - article_thematiques : liens articles <-> thematiques avec force
 * - enrichissement_queue : file d'attente pour traitement batch
 * - article_thematiques_historique : historique des modifications
 *
 * Colonnes ajoutees:
 * - jeux.thematiques_updated_at
 * - livres.thematiques_updated_at
 * - films.thematiques_updated_at
 * - disques.thematiques_updated_at
 *
 * Usage:
 *   node database/migrations/addThematiquesUnifiees.js up
 *   node database/migrations/addThematiquesUnifiees.js down
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
  const [results] = await sequelize.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = '${indexName}'`);
  return results.length > 0;
}

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Migration Thematiques Unifiees ===\n');

  // 1. Table thematiques
  console.log('1. Creation table thematiques...');
  if (await tableExists('thematiques')) {
    console.log('   Table thematiques existe deja.');
  } else {
    await queryInterface.createTable('thematiques', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nom: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      nom_normalise: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Lowercase, sans accents, pour deduplication'
      },
      type: {
        type: Sequelize.ENUM('theme', 'mecanisme', 'ambiance', 'public', 'complexite', 'duree', 'autre'),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      actif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Compteur utilisation pour pertinence'
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
    console.log('   Table thematiques creee.');
  }

  // Index unique sur nom_normalise + type
  if (await tableExists('thematiques') && !(await indexExists('thematiques', 'unique_nom_type'))) {
    await sequelize.query(`
      ALTER TABLE thematiques
      ADD UNIQUE KEY unique_nom_type (nom_normalise, type)
    `);
    console.log('   Index unique_nom_type ajoute.');
  }

  // 2. Table thematiques_alias
  console.log('2. Creation table thematiques_alias...');
  if (await tableExists('thematiques_alias')) {
    console.log('   Table thematiques_alias existe deja.');
  } else {
    await queryInterface.createTable('thematiques_alias', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      thematique_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'thematiques',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      alias: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      alias_normalise: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    console.log('   Table thematiques_alias creee.');
  }

  if (await tableExists('thematiques_alias') && !(await indexExists('thematiques_alias', 'unique_alias'))) {
    await sequelize.query(`
      ALTER TABLE thematiques_alias
      ADD UNIQUE KEY unique_alias (alias_normalise)
    `);
    console.log('   Index unique_alias ajoute.');
  }

  // 3. Table article_thematiques
  console.log('3. Creation table article_thematiques...');
  if (await tableExists('article_thematiques')) {
    console.log('   Table article_thematiques existe deja.');
  } else {
    await queryInterface.createTable('article_thematiques', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      type_article: {
        type: Sequelize.ENUM('jeu', 'livre', 'film', 'disque'),
        allowNull: false
      },
      article_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      thematique_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'thematiques',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      force: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.50,
        comment: '0.00 a 1.00'
      },
      source: {
        type: Sequelize.ENUM('ia', 'manuel', 'import'),
        allowNull: false,
        defaultValue: 'ia'
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
    console.log('   Table article_thematiques creee.');
  }

  // Ajouter les index s'ils n'existent pas
  if (await tableExists('article_thematiques')) {
    if (!(await indexExists('article_thematiques', 'unique_article_thematique'))) {
      await sequelize.query(`ALTER TABLE article_thematiques ADD UNIQUE KEY unique_article_thematique (type_article, article_id, thematique_id)`);
      console.log('   Index unique_article_thematique ajoute.');
    }
    if (!(await indexExists('article_thematiques', 'idx_article'))) {
      await sequelize.query(`ALTER TABLE article_thematiques ADD INDEX idx_article (type_article, article_id)`);
      console.log('   Index idx_article ajoute.');
    }
    if (!(await indexExists('article_thematiques', 'idx_thematique'))) {
      await sequelize.query(`ALTER TABLE article_thematiques ADD INDEX idx_thematique (thematique_id)`);
      console.log('   Index idx_thematique ajoute.');
    }
    if (!(await indexExists('article_thematiques', 'idx_force'))) {
      await sequelize.query(`ALTER TABLE article_thematiques ADD INDEX idx_force (\`force\`)`);
      console.log('   Index idx_force ajoute.');
    }
  }

  // 4. Table enrichissement_queue
  console.log('4. Creation table enrichissement_queue...');
  if (await tableExists('enrichissement_queue')) {
    console.log('   Table enrichissement_queue existe deja.');
  } else {
    await queryInterface.createTable('enrichissement_queue', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      type_article: {
        type: Sequelize.ENUM('jeu', 'livre', 'film', 'disque'),
        allowNull: false
      },
      article_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      statut: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'validated', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      priorite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Plus haut = plus prioritaire'
      },
      batch_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'UUID du batch'
      },
      llm_provider: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      llm_model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      prompt_used: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      response_raw: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reponse brute de IA'
      },
      thematiques_proposees: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '[{nom, type, force}, ...]'
      },
      tokens_input: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      tokens_output: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      cout_estime: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        comment: 'En USD'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validated_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK vers adherents (admin)'
      }
    });
    console.log('   Table enrichissement_queue creee.');
  }

  // Ajouter les index s'ils n'existent pas
  if (await tableExists('enrichissement_queue')) {
    if (!(await indexExists('enrichissement_queue', 'idx_statut'))) {
      await sequelize.query(`ALTER TABLE enrichissement_queue ADD INDEX idx_statut (statut)`);
      console.log('   Index idx_statut ajoute.');
    }
    if (!(await indexExists('enrichissement_queue', 'idx_batch'))) {
      await sequelize.query(`ALTER TABLE enrichissement_queue ADD INDEX idx_batch (batch_id)`);
      console.log('   Index idx_batch ajoute.');
    }
    if (!(await indexExists('enrichissement_queue', 'idx_article'))) {
      await sequelize.query(`ALTER TABLE enrichissement_queue ADD INDEX idx_article (type_article, article_id)`);
      console.log('   Index idx_article ajoute.');
    }
    if (!(await indexExists('enrichissement_queue', 'idx_priorite'))) {
      await sequelize.query(`ALTER TABLE enrichissement_queue ADD INDEX idx_priorite (priorite DESC)`);
      console.log('   Index idx_priorite ajoute.');
    }
  }

  // 5. Table article_thematiques_historique
  console.log('5. Creation table article_thematiques_historique...');
  if (await tableExists('article_thematiques_historique')) {
    console.log('   Table article_thematiques_historique existe deja.');
  } else {
    await queryInterface.createTable('article_thematiques_historique', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      type_article: {
        type: Sequelize.ENUM('jeu', 'livre', 'film', 'disque'),
        allowNull: false
      },
      article_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      action: {
        type: Sequelize.ENUM('add', 'update', 'delete', 'batch_replace'),
        allowNull: false
      },
      thematique_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      thematique_nom: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Copie pour historique si thematique supprimee'
      },
      force_avant: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      force_apres: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('ia', 'manuel', 'import', 'validation'),
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK vers adherents'
      },
      user_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      batch_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Details additionnels'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    console.log('   Table article_thematiques_historique creee.');
  }

  // Ajouter les index s'ils n'existent pas
  if (await tableExists('article_thematiques_historique')) {
    if (!(await indexExists('article_thematiques_historique', 'idx_article'))) {
      await sequelize.query(`ALTER TABLE article_thematiques_historique ADD INDEX idx_article (type_article, article_id)`);
      console.log('   Index idx_article ajoute.');
    }
    if (!(await indexExists('article_thematiques_historique', 'idx_user'))) {
      await sequelize.query(`ALTER TABLE article_thematiques_historique ADD INDEX idx_user (user_id)`);
      console.log('   Index idx_user ajoute.');
    }
    if (!(await indexExists('article_thematiques_historique', 'idx_date'))) {
      await sequelize.query(`ALTER TABLE article_thematiques_historique ADD INDEX idx_date (created_at)`);
      console.log('   Index idx_date ajoute.');
    }
  }

  // 6. Ajout colonnes thematiques_updated_at aux tables articles
  console.log('6. Ajout colonnes thematiques_updated_at...');

  const tables = ['jeux', 'livres', 'films', 'disques'];
  for (const table of tables) {
    try {
      // Verifier si la colonne existe deja
      const [columns] = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE 'thematiques_updated_at'`);
      if (columns.length === 0) {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN thematiques_updated_at TIMESTAMP NULL`);
        console.log(`   Colonne ajoutee a ${table}`);
      } else {
        console.log(`   Colonne deja presente dans ${table}`);
      }
    } catch (e) {
      console.log(`   Table ${table} non trouvee, skip`);
    }
  }

  console.log('\n=== Migration terminee avec succes ===');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('=== Rollback Thematiques Unifiees ===\n');

  // Supprimer les colonnes ajoutees
  const tables = ['jeux', 'livres', 'films', 'disques'];
  for (const table of tables) {
    try {
      await sequelize.query(`ALTER TABLE ${table} DROP COLUMN thematiques_updated_at`);
      console.log(`Colonne supprimee de ${table}`);
    } catch (e) {
      console.log(`Skip ${table}`);
    }
  }

  // Supprimer les tables dans l'ordre inverse (contraintes FK)
  const tablesToDrop = [
    'article_thematiques_historique',
    'enrichissement_queue',
    'article_thematiques',
    'thematiques_alias',
    'thematiques'
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
      console.log('Usage: node addThematiquesUnifiees.js [up|down]');
    }
  } catch (error) {
    console.error('Erreur migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
