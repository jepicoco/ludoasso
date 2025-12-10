/**
 * Migration: Add themes_site table
 * Table pour gerer les themes du site public
 *
 * Run: node database/migrations/addThemesSite.js up
 * Rollback: node database/migrations/addThemesSite.js down
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

// Themes predefinis
const themesPredefinis = [
  {
    code: 'default',
    nom: 'Violet Gradient',
    description: 'Theme par defaut avec gradient violet moderne',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#667eea',
    couleur_primaire_light: '#f0f4ff',
    couleur_primaire_dark: '#5568d3',
    couleur_secondaire: '#764ba2',
    couleur_accent: '#20c997',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f8f9fa',
    couleur_fond_navbar: null,
    couleur_fond_footer: '#343a40',
    couleur_texte_principal: '#333333',
    couleur_texte_secondaire: '#6c757d',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#ffffff',
    couleur_success: '#10b981',
    couleur_warning: '#f59e0b',
    couleur_danger: '#ef4444',
    couleur_info: '#3b82f6',
    couleur_badge_jeu: '#0d6efd',
    couleur_badge_livre: '#6610f2',
    couleur_badge_film: '#d63384',
    couleur_badge_disque: '#fd7e14',
    navbar_style: 'gradient',
    shadow_style: 'subtle',
    border_radius: '8px',
    ordre_affichage: 0
  },
  {
    code: 'ocean-blue',
    nom: 'Ocean Blue',
    description: 'Theme bleu ocean frais et professionnel',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#0077b6',
    couleur_primaire_light: '#e6f4f9',
    couleur_primaire_dark: '#005a8a',
    couleur_secondaire: '#00b4d8',
    couleur_accent: '#ff6b6b',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f0f7fa',
    couleur_fond_navbar: null,
    couleur_fond_footer: '#023047',
    couleur_texte_principal: '#1a1a2e',
    couleur_texte_secondaire: '#4a5568',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#ffffff',
    couleur_success: '#2ecc71',
    couleur_warning: '#f1c40f',
    couleur_danger: '#e74c3c',
    couleur_info: '#3498db',
    couleur_badge_jeu: '#0077b6',
    couleur_badge_livre: '#48cae4',
    couleur_badge_film: '#ff6b6b',
    couleur_badge_disque: '#ffd166',
    navbar_style: 'gradient',
    shadow_style: 'medium',
    border_radius: '12px',
    ordre_affichage: 1
  },
  {
    code: 'forest-green',
    nom: 'Foret Verdoyante',
    description: 'Theme vert nature apaisant',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#2d6a4f',
    couleur_primaire_light: '#e8f5f0',
    couleur_primaire_dark: '#1b4332',
    couleur_secondaire: '#52b788',
    couleur_accent: '#ee9b00',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f4f9f4',
    couleur_fond_navbar: null,
    couleur_fond_footer: '#1b4332',
    couleur_texte_principal: '#2d2d2d',
    couleur_texte_secondaire: '#5a5a5a',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#ffffff',
    couleur_success: '#40916c',
    couleur_warning: '#ee9b00',
    couleur_danger: '#bc4749',
    couleur_info: '#168aad',
    couleur_badge_jeu: '#2d6a4f',
    couleur_badge_livre: '#95d5b2',
    couleur_badge_film: '#bc4749',
    couleur_badge_disque: '#ee9b00',
    navbar_style: 'gradient',
    shadow_style: 'subtle',
    border_radius: '6px',
    ordre_affichage: 2
  },
  {
    code: 'sunset-orange',
    nom: 'Coucher de Soleil',
    description: 'Theme chaleureux aux tons oranges',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#e85d04',
    couleur_primaire_light: '#fff3e6',
    couleur_primaire_dark: '#c14c02',
    couleur_secondaire: '#ff006e',
    couleur_accent: '#8338ec',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#fff8f5',
    couleur_fond_navbar: null,
    couleur_fond_footer: '#370617',
    couleur_texte_principal: '#1a1a1a',
    couleur_texte_secondaire: '#555555',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#ffffff',
    couleur_success: '#06d6a0',
    couleur_warning: '#ffd60a',
    couleur_danger: '#d00000',
    couleur_info: '#3a86ff',
    couleur_badge_jeu: '#e85d04',
    couleur_badge_livre: '#8338ec',
    couleur_badge_film: '#ff006e',
    couleur_badge_disque: '#ffbe0b',
    navbar_style: 'gradient',
    shadow_style: 'medium',
    border_radius: '10px',
    ordre_affichage: 3
  },
  {
    code: 'elegant-dark',
    nom: 'Elegant Sombre',
    description: 'Theme sombre elegant et moderne',
    type: 'system',
    mode: 'dark',
    couleur_primaire: '#6366f1',
    couleur_primaire_light: '#312e81',
    couleur_primaire_dark: '#4338ca',
    couleur_secondaire: '#8b5cf6',
    couleur_accent: '#22d3ee',
    couleur_fond_principal: '#0f172a',
    couleur_fond_secondaire: '#1e293b',
    couleur_fond_navbar: '#0f172a',
    couleur_fond_footer: '#020617',
    couleur_texte_principal: '#f1f5f9',
    couleur_texte_secondaire: '#94a3b8',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#cbd5e1',
    couleur_success: '#10b981',
    couleur_warning: '#f59e0b',
    couleur_danger: '#f43f5e',
    couleur_info: '#06b6d4',
    couleur_badge_jeu: '#6366f1',
    couleur_badge_livre: '#a78bfa',
    couleur_badge_film: '#f472b6',
    couleur_badge_disque: '#fbbf24',
    navbar_style: 'solid',
    shadow_style: 'strong',
    border_radius: '8px',
    ordre_affichage: 4
  },
  {
    code: 'minimalist-gray',
    nom: 'Minimaliste',
    description: 'Theme gris minimaliste et epure',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#374151',
    couleur_primaire_light: '#f3f4f6',
    couleur_primaire_dark: '#1f2937',
    couleur_secondaire: '#6b7280',
    couleur_accent: '#3b82f6',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f9fafb',
    couleur_fond_navbar: '#1f2937',
    couleur_fond_footer: '#111827',
    couleur_texte_principal: '#111827',
    couleur_texte_secondaire: '#6b7280',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#d1d5db',
    couleur_success: '#059669',
    couleur_warning: '#d97706',
    couleur_danger: '#dc2626',
    couleur_info: '#2563eb',
    couleur_badge_jeu: '#3b82f6',
    couleur_badge_livre: '#8b5cf6',
    couleur_badge_film: '#ec4899',
    couleur_badge_disque: '#f59e0b',
    navbar_style: 'solid',
    shadow_style: 'none',
    border_radius: '4px',
    ordre_affichage: 5
  },
  {
    code: 'association-classic',
    nom: 'Classique Association',
    description: 'Theme classique ideal pour les associations',
    type: 'system',
    mode: 'light',
    couleur_primaire: '#0d6efd',
    couleur_primaire_light: '#e7f1ff',
    couleur_primaire_dark: '#0a58ca',
    couleur_secondaire: '#6c757d',
    couleur_accent: '#198754',
    couleur_fond_principal: '#ffffff',
    couleur_fond_secondaire: '#f8f9fa',
    couleur_fond_navbar: null,
    couleur_fond_footer: '#212529',
    couleur_texte_principal: '#212529',
    couleur_texte_secondaire: '#6c757d',
    couleur_texte_navbar: '#ffffff',
    couleur_texte_footer: '#ffffff',
    couleur_success: '#198754',
    couleur_warning: '#ffc107',
    couleur_danger: '#dc3545',
    couleur_info: '#0dcaf0',
    couleur_badge_jeu: '#0d6efd',
    couleur_badge_livre: '#6f42c1',
    couleur_badge_film: '#d63384',
    couleur_badge_disque: '#fd7e14',
    navbar_style: 'gradient',
    shadow_style: 'subtle',
    border_radius: '6px',
    ordre_affichage: 6
  }
];

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('Creating themes_site table...');

    // Verifier si la table existe deja
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'themes_site'"
    );

    if (tables.length > 0) {
      console.log('Table themes_site already exists, skipping...');
      return;
    }

    await connection.query(`
      CREATE TABLE themes_site (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Identite
        code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Code unique du theme',
        nom VARCHAR(100) NOT NULL COMMENT 'Nom du theme',
        description TEXT NULL COMMENT 'Description du theme',

        -- Type
        type ENUM('system', 'custom') DEFAULT 'custom' COMMENT 'Type de theme',
        mode ENUM('light', 'dark') DEFAULT 'light' COMMENT 'Mode clair ou sombre',

        -- Couleurs principales
        couleur_primaire VARCHAR(20) DEFAULT '#667eea' COMMENT 'Couleur principale',
        couleur_primaire_light VARCHAR(20) DEFAULT '#f0f4ff' COMMENT 'Variante claire',
        couleur_primaire_dark VARCHAR(20) DEFAULT '#5568d3' COMMENT 'Variante foncee',
        couleur_secondaire VARCHAR(20) DEFAULT '#764ba2' COMMENT 'Couleur secondaire',
        couleur_accent VARCHAR(20) DEFAULT '#20c997' COMMENT 'Couleur accent',

        -- Couleurs de fond
        couleur_fond_principal VARCHAR(20) DEFAULT '#ffffff' COMMENT 'Fond principal',
        couleur_fond_secondaire VARCHAR(20) DEFAULT '#f8f9fa' COMMENT 'Fond secondaire',
        couleur_fond_navbar VARCHAR(20) NULL COMMENT 'Fond navbar (null = gradient)',
        couleur_fond_footer VARCHAR(20) DEFAULT '#343a40' COMMENT 'Fond footer',

        -- Couleurs de texte
        couleur_texte_principal VARCHAR(20) DEFAULT '#333333' COMMENT 'Texte principal',
        couleur_texte_secondaire VARCHAR(20) DEFAULT '#6c757d' COMMENT 'Texte secondaire',
        couleur_texte_navbar VARCHAR(20) DEFAULT '#ffffff' COMMENT 'Texte navbar',
        couleur_texte_footer VARCHAR(20) DEFAULT '#ffffff' COMMENT 'Texte footer',

        -- Couleurs semantiques
        couleur_success VARCHAR(20) DEFAULT '#10b981' COMMENT 'Couleur succes',
        couleur_warning VARCHAR(20) DEFAULT '#f59e0b' COMMENT 'Couleur warning',
        couleur_danger VARCHAR(20) DEFAULT '#ef4444' COMMENT 'Couleur danger',
        couleur_info VARCHAR(20) DEFAULT '#3b82f6' COMMENT 'Couleur info',

        -- Couleurs badges
        couleur_badge_jeu VARCHAR(20) DEFAULT '#0d6efd' COMMENT 'Badge jeu',
        couleur_badge_livre VARCHAR(20) DEFAULT '#6610f2' COMMENT 'Badge livre',
        couleur_badge_film VARCHAR(20) DEFAULT '#d63384' COMMENT 'Badge film',
        couleur_badge_disque VARCHAR(20) DEFAULT '#fd7e14' COMMENT 'Badge disque',

        -- Typographie
        police_principale VARCHAR(100) DEFAULT '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' COMMENT 'Police principale',
        police_titres VARCHAR(100) NULL COMMENT 'Police titres',
        taille_police_base VARCHAR(10) DEFAULT '16px' COMMENT 'Taille de base',

        -- Style
        border_radius VARCHAR(10) DEFAULT '8px' COMMENT 'Rayon bordures',
        shadow_style ENUM('none', 'subtle', 'medium', 'strong') DEFAULT 'subtle' COMMENT 'Style ombres',
        navbar_style ENUM('gradient', 'solid', 'transparent') DEFAULT 'gradient' COMMENT 'Style navbar',

        -- CSS personnalise
        css_personnalise TEXT NULL COMMENT 'CSS additionnel',

        -- Preview
        preview_image VARCHAR(255) NULL COMMENT 'Image preview',

        -- Statut
        actif BOOLEAN DEFAULT TRUE COMMENT 'Theme actif',
        ordre_affichage INT DEFAULT 0 COMMENT 'Ordre affichage',

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Index
        INDEX idx_code (code),
        INDEX idx_actif (actif),
        INDEX idx_type (type),
        INDEX idx_ordre (ordre_affichage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Themes du site public'
    `);

    console.log('Table themes_site created successfully!');

    // Inserer les themes predefinis
    console.log('Inserting predefined themes...');

    for (const theme of themesPredefinis) {
      const colonnes = Object.keys(theme);
      const placeholders = colonnes.map(() => '?').join(', ');
      const valeurs = colonnes.map(c => theme[c]);

      await connection.query(
        `INSERT INTO themes_site (${colonnes.join(', ')}) VALUES (${placeholders})`,
        valeurs
      );
    }

    console.log(`${themesPredefinis.length} predefined themes inserted!`);

    // Ajouter champ theme_id a parametres_front si absent
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM parametres_front LIKE 'theme_id'"
    );

    if (columns.length === 0) {
      console.log('Adding theme_id to parametres_front...');
      await connection.query(`
        ALTER TABLE parametres_front
        ADD COLUMN theme_id INT NULL COMMENT 'Theme actif' AFTER css_personnalise,
        ADD COLUMN allow_theme_selection BOOLEAN DEFAULT FALSE COMMENT 'Autoriser selection theme par visiteurs' AFTER theme_id
      `);
      console.log('Column theme_id added!');
    }

  } catch (error) {
    console.error('Migration error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('Dropping themes_site table...');
    await connection.query('DROP TABLE IF EXISTS themes_site');
    console.log('Table themes_site dropped!');

    // Supprimer les colonnes ajoutees a parametres_front
    try {
      await connection.query('ALTER TABLE parametres_front DROP COLUMN theme_id');
      await connection.query('ALTER TABLE parametres_front DROP COLUMN allow_theme_selection');
    } catch (e) {
      // Ignorer si colonnes n'existent pas
    }
  } catch (error) {
    console.error('Rollback error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration based on command line argument
const command = process.argv[2];
if (command === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (command === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('Usage: node addThemesSite.js [up|down]');
  process.exit(1);
}
