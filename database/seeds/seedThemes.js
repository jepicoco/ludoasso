/**
 * Seed: Insert predefined themes
 *
 * Run: node database/seeds/seedThemes.js
 *
 * This script:
 * 1. Creates the themes_site table if it doesn't exist
 * 2. Adds theme_id column to parametres_front if missing
 * 3. Inserts 4 predefined themes (if not already present)
 * 4. Sets the default theme as active
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

const themesPredefinis = [
  {
    code: 'default',
    nom: 'Violet Gradient',
    description: 'Theme par defaut avec gradient violet moderne',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#667eea',
    couleur_secondaire: '#764ba2',
    couleur_accent: '#20c997',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f8f9fa',
    couleur_texte_principal: '#333333',
    couleur_texte_secondaire: '#6c757d',
    couleur_success: '#10b981',
    couleur_warning: '#f59e0b',
    couleur_danger: '#ef4444',
    couleur_info: '#3b82f6',
    navbar_style: 'gradient',
    shadow_style: 'subtle',
    border_radius: '8px',
    ordre_affichage: 0,
    actif: true
  },
  {
    code: 'ocean-blue',
    nom: 'Ocean Blue',
    description: 'Theme bleu ocean frais et professionnel',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#0077b6',
    couleur_secondaire: '#00b4d8',
    couleur_accent: '#ff6b6b',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f0f7fa',
    couleur_texte_principal: '#1a1a2e',
    couleur_texte_secondaire: '#4a5568',
    couleur_success: '#2ecc71',
    couleur_warning: '#f1c40f',
    couleur_danger: '#e74c3c',
    couleur_info: '#3498db',
    navbar_style: 'gradient',
    shadow_style: 'medium',
    border_radius: '12px',
    ordre_affichage: 1,
    actif: true
  },
  {
    code: 'forest-green',
    nom: 'Foret Verdoyante',
    description: 'Theme vert nature apaisant',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#2d6a4f',
    couleur_secondaire: '#52b788',
    couleur_accent: '#ee9b00',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f4f9f4',
    couleur_texte_principal: '#2d2d2d',
    couleur_texte_secondaire: '#5a5a5a',
    couleur_success: '#40916c',
    couleur_warning: '#ee9b00',
    couleur_danger: '#bc4749',
    couleur_info: '#168aad',
    navbar_style: 'gradient',
    shadow_style: 'subtle',
    border_radius: '6px',
    ordre_affichage: 2,
    actif: true
  },
  {
    code: 'elegant-dark',
    nom: 'Elegant Sombre',
    description: 'Theme sombre elegant et moderne',
    type: 'system',
    mode: 'dark',
    couleur_primaire: '#6366f1',
    couleur_secondaire: '#8b5cf6',
    couleur_accent: '#22d3ee',
    couleur_fond_principal: '#0f172a',
    couleur_fond_secondaire: '#1e293b',
    couleur_texte_principal: '#f1f5f9',
    couleur_texte_secondaire: '#94a3b8',
    couleur_success: '#10b981',
    couleur_warning: '#f59e0b',
    couleur_danger: '#f43f5e',
    couleur_info: '#06b6d4',
    navbar_style: 'solid',
    shadow_style: 'strong',
    border_radius: '8px',
    ordre_affichage: 3,
    actif: true
  }
];

async function run() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Seed Themes ===\n');

    // 1. Verifier si la table existe
    const [tables] = await connection.query("SHOW TABLES LIKE 'themes_site'");

    if (tables.length === 0) {
      console.log('Table themes_site inexistante. Executez d\'abord:');
      console.log('  node database/migrations/addThemesSite.js up');
      await connection.end();
      return;
    }

    // 2. Verifier si des themes existent deja
    const [existingThemes] = await connection.query('SELECT COUNT(*) as count FROM themes_site');

    if (existingThemes[0].count > 0) {
      console.log(`${existingThemes[0].count} theme(s) deja present(s) en base.`);

      // Lister les themes existants
      const [themes] = await connection.query('SELECT id, code, nom FROM themes_site ORDER BY ordre_affichage');
      themes.forEach(t => console.log(`  - ${t.id}: ${t.code} (${t.nom})`));

      console.log('\nPour reinitialiser les themes, supprimez-les d\'abord manuellement.');
      await connection.end();
      return;
    }

    // 3. Ajouter colonne theme_id a parametres_front si absente
    const [columns] = await connection.query("SHOW COLUMNS FROM parametres_front LIKE 'theme_id'");

    if (columns.length === 0) {
      console.log('Ajout de theme_id a parametres_front...');
      await connection.query(`
        ALTER TABLE parametres_front
        ADD COLUMN theme_id INT NULL COMMENT 'Theme actif',
        ADD COLUMN allow_theme_selection BOOLEAN DEFAULT FALSE COMMENT 'Autoriser selection theme par visiteurs'
      `);
      console.log('  OK\n');
    }

    // 4. Inserer les themes
    console.log('Insertion des themes predefinis...');

    for (const theme of themesPredefinis) {
      theme.created_at = new Date();
      theme.updated_at = new Date();

      const colonnes = Object.keys(theme);
      const placeholders = colonnes.map(() => '?').join(', ');
      const valeurs = colonnes.map(c => theme[c]);

      await connection.query(
        `INSERT INTO themes_site (${colonnes.join(', ')}) VALUES (${placeholders})`,
        valeurs
      );
      console.log(`  + ${theme.nom} (${theme.mode})`);
    }

    // 5. Activer le theme par defaut
    const [defaultTheme] = await connection.query('SELECT id FROM themes_site WHERE code = ?', ['default']);

    if (defaultTheme.length > 0) {
      await connection.query('UPDATE parametres_front SET theme_id = ? WHERE id = 1', [defaultTheme[0].id]);
      console.log(`\nTheme actif: Violet Gradient (ID: ${defaultTheme[0].id})`);
    }

    console.log(`\n${themesPredefinis.length} themes inseres avec succes!`);

  } catch (error) {
    console.error('Erreur:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Exécution si appelé directement
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = run;
