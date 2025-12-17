#!/usr/bin/env node
/**
 * Installation Script - Liberteko
 *
 * Ce script effectue l'installation complete de l'application:
 * 1. Verifie/cree le fichier .env
 * 2. Teste la connexion a la base de donnees
 * 3. Execute toutes les migrations
 * 4. Execute les seeds systeme
 * 5. Cree un admin par defaut si necessaire
 *
 * Usage:
 *   npm run install:first
 *   node scripts/install.js
 *   node scripts/install.js --check  (verification sans installation)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.cyan}[${step}]${colors.reset} ${colors.bright}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`  ${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`  ${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`  ${colors.red}✗${colors.reset} ${message}`);
}

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================
// Etape 1: Verification/Creation du .env
// ============================================

function checkEnvFile() {
  logStep('1/5', 'Verification du fichier .env');

  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  if (fs.existsSync(envPath)) {
    logSuccess('Fichier .env trouve');

    // Verifier les secrets
    require('dotenv').config({ path: envPath });

    const warnings = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET manquant ou trop court (min 32 caracteres)');
    }
    if (!process.env.EMAIL_ENCRYPTION_KEY || process.env.EMAIL_ENCRYPTION_KEY.length < 32) {
      warnings.push('EMAIL_ENCRYPTION_KEY manquant ou trop court (min 32 caracteres)');
    }
    if (!process.env.DB_NAME) {
      warnings.push('DB_NAME non configure');
    }

    if (warnings.length > 0) {
      warnings.forEach(w => logWarning(w));
      return false;
    }

    return true;
  }

  // Creer le .env depuis l'exemple
  if (!fs.existsSync(envExamplePath)) {
    logError('.env.example non trouve');
    return false;
  }

  logWarning('Fichier .env non trouve, creation depuis .env.example...');

  let envContent = fs.readFileSync(envExamplePath, 'utf8');

  // Generer des secrets securises
  const jwtSecret = generateSecret();
  const emailKey = generateSecret();

  envContent = envContent.replace(
    /JWT_SECRET=.*/,
    `JWT_SECRET=${jwtSecret}`
  );
  envContent = envContent.replace(
    /EMAIL_ENCRYPTION_KEY=.*/,
    `EMAIL_ENCRYPTION_KEY=${emailKey}`
  );

  fs.writeFileSync(envPath, envContent);
  logSuccess('Fichier .env cree avec des secrets securises');
  logWarning('Editez le fichier .env pour configurer la base de donnees');

  // Recharger les variables
  require('dotenv').config({ path: envPath });

  return true;
}

// ============================================
// Etape 2: Test de connexion BDD
// ============================================

async function testDatabaseConnection() {
  logStep('2/5', 'Test de connexion a la base de donnees');

  const mysql = require('mysql2/promise');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME
    });

    await connection.query('SELECT 1');
    await connection.end();

    logSuccess(`Connexion reussie a ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    return true;

  } catch (error) {
    if (error.code === 'ER_BAD_DB_ERROR') {
      logWarning(`Base de donnees '${process.env.DB_NAME}' n'existe pas`);
      log(`  → Creez-la avec: CREATE DATABASE ${process.env.DB_NAME};`, 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      logError('MySQL non accessible');
      log('  → Verifiez que MySQL est demarre', 'yellow');
    } else {
      logError(`Erreur: ${error.message}`);
    }
    return false;
  }
}

// ============================================
// Etape 3: Execution des migrations
// ============================================

async function runMigrations() {
  logStep('3/5', 'Execution des migrations');

  try {
    const migratePath = path.join(__dirname, '..', 'database', 'migrate.js');

    return new Promise((resolve) => {
      const child = spawn('node', [migratePath, 'up'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          const lines = output.split('\n');
          const migrated = lines.filter(l => l.includes('Succès') || l.includes('Success')).length;

          if (migrated > 0) {
            logSuccess(`${migrated} migration(s) executee(s)`);
          } else if (output.includes('Aucune migration')) {
            logSuccess('Aucune migration en attente');
          } else {
            logSuccess('Migrations terminees');
          }
          resolve(true);
        } else {
          logError('Erreur lors des migrations');
          console.log(output);
          resolve(false);
        }
      });
    });

  } catch (error) {
    logError(`Erreur: ${error.message}`);
    return false;
  }
}

// ============================================
// Etape 4: Execution des seeds systeme
// ============================================

async function runSystemSeeds() {
  logStep('4/5', 'Initialisation des donnees systeme');

  const { sequelize } = require('../backend/models');

  try {
    await sequelize.sync({ alter: false });
    logSuccess('Modeles synchronises');

    const seeds = [
      { name: 'Templates messages', fn: '../database/seeds/seedTemplatesMessages' },
      { name: 'Event triggers', fn: '../database/seeds/seedEventTriggers' },
      { name: 'Themes', fn: '../database/seeds/seedThemes' }
    ];

    for (const seed of seeds) {
      try {
        const seedFn = require(seed.fn);
        await seedFn();
        logSuccess(seed.name);
      } catch (e) {
        logWarning(`${seed.name}: ${e.message}`);
      }
    }

    return true;

  } catch (error) {
    logError(`Erreur: ${error.message}`);
    return false;
  }
}

// ============================================
// Etape 5: Creation admin par defaut
// ============================================

async function createDefaultAdmin() {
  logStep('5/5', 'Verification du compte administrateur');

  const { Utilisateur } = require('../backend/models');

  try {
    const existingAdmin = await Utilisateur.findOne({
      where: { role: 'administrateur' }
    });

    if (existingAdmin) {
      logSuccess(`Admin existant: ${existingAdmin.email}`);
      return { created: false, email: existingAdmin.email };
    }

    const defaultPassword = 'admin123';
    // Le hook beforeCreate du modèle hash automatiquement le password

    const admin = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'Liberteko',
      email: 'admin@liberteko.local',
      password: defaultPassword,
      role: 'administrateur',
      statut: 'actif'
    });

    logSuccess('Compte administrateur cree');
    return {
      created: true,
      email: admin.email,
      password: defaultPassword
    };

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      logWarning('Email admin@liberteko.local deja utilise');
      return { created: false };
    }
    logError(`Erreur: ${error.message}`);
    return { created: false, error: error.message };
  }
}

// ============================================
// Main
// ============================================

async function main() {
  const isCheckOnly = process.argv.includes('--check');

  console.log('\n' + '═'.repeat(50));
  log(' Liberteko - Installation', 'cyan');
  console.log('═'.repeat(50));

  if (isCheckOnly) {
    log('\nMode verification (--check)\n', 'yellow');
  }

  const envOk = checkEnvFile();
  if (!envOk && !isCheckOnly) {
    log('\n→ Configurez le fichier .env puis relancez ce script', 'yellow');
    process.exit(1);
  }

  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    log('\n→ Corrigez la configuration de la base de donnees', 'yellow');
    process.exit(1);
  }

  if (isCheckOnly) {
    log('\n✓ Verification terminee - Tout est OK\n', 'green');
    process.exit(0);
  }

  const migrationsOk = await runMigrations();
  if (!migrationsOk) {
    log('\n→ Corrigez les erreurs de migration', 'yellow');
    process.exit(1);
  }

  await runSystemSeeds();

  const adminResult = await createDefaultAdmin();

  console.log('\n' + '═'.repeat(50));
  log(' Installation terminee !', 'green');
  console.log('═'.repeat(50));

  if (adminResult.created) {
    console.log('\n' + colors.yellow + '┌─────────────────────────────────────────────┐');
    console.log('│ IDENTIFIANTS ADMINISTRATEUR                  │');
    console.log('├─────────────────────────────────────────────┤');
    console.log(`│ Email:    ${adminResult.email.padEnd(32)}│`);
    console.log(`│ Mot de passe: ${adminResult.password.padEnd(28)}│`);
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ CHANGEZ CE MOT DE PASSE APRES CONNEXION!    │');
    console.log('└─────────────────────────────────────────────┘' + colors.reset);
  }

  console.log('\n→ Demarrez le serveur avec: npm run dev\n');

  process.exit(0);
}

main().catch(error => {
  logError(`Erreur fatale: ${error.message}`);
  console.error(error);
  process.exit(1);
});
