/**
 * Migration: Ajout de la table configurations_llm
 * Pour la configuration des providers LLM (Anthropic, OpenAI, Mistral, Ollama)
 *
 * Usage:
 *   node database/migrations/addConfigurationsLLM.js up
 *   node database/migrations/addConfigurationsLLM.js down
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

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Creating table configurations_llm...');

  await queryInterface.createTable('configurations_llm', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    provider: {
      type: Sequelize.ENUM('anthropic', 'openai', 'mistral', 'ollama'),
      allowNull: false
    },
    libelle: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    api_key_encrypted: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Clé API chiffrée avec AES-256'
    },
    base_url: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'URL custom pour Ollama ou proxy'
    },
    model: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'ex: claude-3-haiku-20240307, gpt-4o-mini'
    },
    max_tokens: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1000
    },
    temperature: {
      type: Sequelize.DECIMAL(2, 1),
      allowNull: false,
      defaultValue: 0.3
    },
    actif: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    par_defaut: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Un seul provider peut être par défaut'
    },
    limite_requetes_jour: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Limite quotidienne (NULL = illimité)'
    },
    requetes_aujourdhui: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    date_reset_compteur: {
      type: Sequelize.DATEONLY,
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

  console.log('Table configurations_llm created successfully.');

  // Ajouter le module recherche_ia dans modules_actifs
  console.log('Adding recherche_ia module to modules_actifs...');

  await sequelize.query(`
    INSERT INTO modules_actifs (code, libelle, description, icone, couleur, actif, ordre_affichage, created_at, updated_at)
    VALUES (
      'recherche_ia',
      'Recherche IA',
      'Recherche intelligente dans le catalogue. Active la barre de recherche IA sur le site usager, la configuration des services LLM externes et les outils de gestion des thematiques.',
      'robot',
      'info',
      0,
      50,
      NOW(),
      NOW()
    )
    ON DUPLICATE KEY UPDATE updated_at = NOW()
  `);

  console.log('Module recherche_ia added successfully.');
  console.log('Migration completed successfully!');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Removing module recherche_ia from modules_actifs...');
  await sequelize.query(`DELETE FROM modules_actifs WHERE code = 'recherche_ia'`);

  console.log('Dropping table configurations_llm...');
  await queryInterface.dropTable('configurations_llm');

  console.log('Rollback completed successfully!');
}

async function main() {
  const command = process.argv[2];

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    if (command === 'up') {
      await up();
    } else if (command === 'down') {
      await down();
    } else {
      console.log('Usage: node addConfigurationsLLM.js [up|down]');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
