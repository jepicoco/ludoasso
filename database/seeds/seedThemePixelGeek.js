/**
 * Seed: Add Pixel Geek theme to database
 *
 * Run: node database/seeds/seedThemePixelGeek.js
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

const pixelGeekTheme = {
  code: 'pixel-geek',
  nom: 'Pixel Geek',
  description: 'Theme retro gaming inspire de Celeste avec effet scanlines et etoiles animees',
  type: 'system',
  mode: 'dark',
  couleur_primaire: '#ff6b9d',
  couleur_secondaire: '#c850c0',
  couleur_accent: '#00d4ff',
  couleur_fond_principal: '#0d0d1a',
  couleur_fond_secondaire: '#1a1a2e',
  couleur_texte_principal: '#ffffff',
  couleur_texte_secondaire: '#a0a0c0',
  couleur_success: '#7bffa0',
  couleur_warning: '#ffeb3b',
  couleur_danger: '#ff4757',
  couleur_info: '#4158d0',
  navbar_style: 'solid',
  shadow_style: 'strong',
  border_radius: '0px',
  ordre_affichage: 10,
  actif: true
};

async function run() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('=== Seed Theme Pixel Geek ===\n');

    // 1. Verifier si la table existe
    const [tables] = await connection.query("SHOW TABLES LIKE 'themes_site'");

    if (tables.length === 0) {
      console.log('Table themes_site inexistante. Executez d\'abord:');
      console.log('  node database/migrations/addThemesSite.js up');
      await connection.end();
      return;
    }

    // 2. Verifier si le theme existe deja
    const [existing] = await connection.query('SELECT id FROM themes_site WHERE code = ?', [pixelGeekTheme.code]);

    if (existing.length > 0) {
      console.log(`Theme "${pixelGeekTheme.nom}" existe deja (ID: ${existing[0].id})`);
      console.log('Pour le mettre a jour, supprimez-le d\'abord ou modifiez-le via l\'admin.');
      await connection.end();
      return;
    }

    // 3. Determiner l'ordre d'affichage
    const [maxOrder] = await connection.query('SELECT MAX(ordre_affichage) as max_ordre FROM themes_site');
    pixelGeekTheme.ordre_affichage = (maxOrder[0].max_ordre || 0) + 1;

    // 4. Inserer le theme
    pixelGeekTheme.created_at = new Date();
    pixelGeekTheme.updated_at = new Date();

    const colonnes = Object.keys(pixelGeekTheme);
    const placeholders = colonnes.map(() => '?').join(', ');
    const valeurs = colonnes.map(c => pixelGeekTheme[c]);

    const [result] = await connection.query(
      `INSERT INTO themes_site (${colonnes.join(', ')}) VALUES (${placeholders})`,
      valeurs
    );

    console.log(`Theme "${pixelGeekTheme.nom}" ajoute avec succes!`);
    console.log(`  ID: ${result.insertId}`);
    console.log(`  Code: ${pixelGeekTheme.code}`);
    console.log(`  Mode: ${pixelGeekTheme.mode}`);
    console.log(`  Ordre: ${pixelGeekTheme.ordre_affichage}`);
    console.log('\nPour activer ce theme:');
    console.log('  1. Allez dans Admin > Parametres > Themes');
    console.log('  2. Cliquez sur "Activer" pour Pixel Geek');

  } catch (error) {
    console.error('Erreur:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
