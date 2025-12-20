/**
 * Migration: Ajout table configuration_acces_donnees
 * Configuration des champs PII visibles par role
 */

const { sequelize } = require('../../backend/models');

// Configuration par defaut
const DEFAULT_CONFIG = {
  champs_visibles_par_role: {
    administrateur: ['nom', 'prenom', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance', 'photo', 'notes'],
    comptable: ['nom', 'prenom', 'email', 'telephone', 'adresse', 'ville', 'code_postal'],
    gestionnaire: ['nom', 'prenom', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance', 'photo', 'notes'],
    agent: ['nom', 'prenom', 'email', 'telephone'],
    benevole: ['nom', 'prenom']
  },
  acces_historique_emprunts: {
    administrateur: true,
    comptable: true,
    gestionnaire: true,
    agent: true,
    benevole: true
  },
  acces_cotisations: {
    administrateur: true,
    comptable: true,
    gestionnaire: true,
    agent: false,
    benevole: false
  }
};

async function up() {
  console.log('=== Migration Configuration Acces Donnees ===\n');

  // 1. Verifier si la table existe deja
  const [tables] = await sequelize.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuration_acces_donnees'
  `);

  if (tables.length > 0) {
    console.log('Table configuration_acces_donnees existe deja, migration ignoree.');
    return;
  }

  // 2. Creer la table
  console.log('1. Creation table configuration_acces_donnees...');
  await sequelize.query(`
    CREATE TABLE configuration_acces_donnees (
      id INT PRIMARY KEY AUTO_INCREMENT,
      champs_visibles_par_role JSON NOT NULL,
      acces_historique_emprunts JSON NOT NULL,
      acces_cotisations JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('   OK table creee');

  // 3. Inserer la configuration par defaut
  console.log('2. Insertion configuration par defaut...');
  await sequelize.query(`
    INSERT INTO configuration_acces_donnees
    (champs_visibles_par_role, acces_historique_emprunts, acces_cotisations, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
  `, {
    replacements: [
      JSON.stringify(DEFAULT_CONFIG.champs_visibles_par_role),
      JSON.stringify(DEFAULT_CONFIG.acces_historique_emprunts),
      JSON.stringify(DEFAULT_CONFIG.acces_cotisations)
    ]
  });
  console.log('   OK configuration inseree');

  console.log('\n=== Migration terminee ===');
}

async function down() {
  console.log('=== Rollback Configuration Acces Donnees ===\n');
  await sequelize.query('DROP TABLE IF EXISTS configuration_acces_donnees');
  console.log('   Table supprimee');
}

module.exports = { up, down };
