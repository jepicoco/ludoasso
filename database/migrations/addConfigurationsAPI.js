/**
 * Migration: Add configurations_api table
 * Table pour gerer les configurations d'APIs externes (EAN lookup, ISBN lookup, etc.)
 *
 * Run: node database/migrations/addConfigurationsAPI.js up
 * Rollback: node database/migrations/addConfigurationsAPI.js down
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

async function up() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('Creating configurations_api table...');

    // Verifier si la table existe deja
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'configurations_api'"
    );

    if (tables.length > 0) {
      console.log('Table configurations_api already exists, skipping...');
      return;
    }

    await connection.query(`
      CREATE TABLE configurations_api (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Identite
        libelle VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nom de la configuration API',

        -- Type d'API
        type_api ENUM('ean_lookup', 'isbn_lookup', 'enrichissement', 'custom') NOT NULL DEFAULT 'ean_lookup' COMMENT 'Type API',

        -- Fournisseur
        provider VARCHAR(50) NOT NULL COMMENT 'Fournisseur API (upcitemdb, bgg, openlibrary, tmdb, discogs, etc.)',

        -- Configuration API
        api_url VARCHAR(500) NULL COMMENT 'URL de base de l\\'API',
        api_key_encrypted TEXT NULL COMMENT 'Cle API chiffree (AES-256-CBC)',
        api_secret_encrypted TEXT NULL COMMENT 'Secret API chiffre (optionnel)',

        -- Collections supportees
        collections_supportees JSON DEFAULT '["jeu"]' COMMENT 'Collections supportees: jeu, livre, film, disque',

        -- Mapping des champs
        mapping_champs JSON NULL COMMENT 'Mapping API vers champs Assotheque',

        -- Cache
        cache_active BOOLEAN DEFAULT TRUE COMMENT 'Activer le cache des resultats',
        cache_duree_jours INT DEFAULT 90 COMMENT 'Duree du cache en jours',

        -- Limite de requetes
        limite_requetes INT NULL COMMENT 'Limite de requetes (null = illimite)',
        periode_limite ENUM('jour', 'heure', 'mois') DEFAULT 'jour' COMMENT 'Periode de la limite',
        requetes_compteur INT DEFAULT 0 COMMENT 'Compteur de requetes periode en cours',
        date_reset_compteur DATETIME NULL COMMENT 'Date du prochain reset du compteur',

        -- Priorite et ordre
        priorite INT DEFAULT 0 COMMENT 'Priorite d\\'utilisation (0 = plus haute)',
        ordre_affichage INT DEFAULT 0 COMMENT 'Ordre d\\'affichage dans l\\'interface',

        -- UI
        icone VARCHAR(50) DEFAULT 'bi-search' COMMENT 'Icone Bootstrap Icons',
        couleur VARCHAR(20) DEFAULT 'info' COMMENT 'Couleur Bootstrap',

        -- Acces et statut
        role_minimum ENUM('gestionnaire', 'comptable', 'administrateur') DEFAULT 'gestionnaire' COMMENT 'Role minimum',
        actif BOOLEAN DEFAULT TRUE COMMENT 'Configuration active',
        par_defaut BOOLEAN DEFAULT FALSE COMMENT 'Configuration par defaut pour ce type',

        -- Notes et documentation
        description TEXT NULL COMMENT 'Description de l\\'API',
        notes TEXT NULL COMMENT 'Notes internes',
        documentation_url VARCHAR(500) NULL COMMENT 'URL de la documentation',

        -- Statistiques
        total_requetes INT DEFAULT 0 COMMENT 'Total des requetes effectuees',
        total_succes INT DEFAULT 0 COMMENT 'Total des requetes reussies',
        derniere_utilisation DATETIME NULL COMMENT 'Date de derniere utilisation',
        dernier_statut VARCHAR(50) NULL COMMENT 'Dernier statut de connexion',

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- Index
        INDEX idx_actif (actif),
        INDEX idx_type_api (type_api),
        INDEX idx_provider (provider),
        INDEX idx_priorite (priorite),
        INDEX idx_ordre_affichage (ordre_affichage),
        INDEX idx_par_defaut (par_defaut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Configurations des APIs externes (EAN/ISBN lookup, enrichissement)'
    `);

    console.log('Table configurations_api created successfully!');

    // Inserer les configurations par defaut
    console.log('Inserting default API configurations...');

    await connection.query(`
      INSERT INTO configurations_api
        (libelle, type_api, provider, api_url, collections_supportees, description, limite_requetes, periode_limite, priorite, par_defaut, icone, couleur)
      VALUES
        ('UPCitemdb (EAN)', 'ean_lookup', 'upcitemdb', 'https://api.upcitemdb.com/prod/trial/lookup', '["jeu"]', 'API gratuite pour recherche EAN. Limite: 100 requetes/jour.', 100, 'jour', 0, TRUE, 'bi-upc-scan', 'primary'),
        ('BoardGameGeek', 'ean_lookup', 'bgg', 'https://boardgamegeek.com/xmlapi2', '["jeu"]', 'API BoardGameGeek pour enrichissement jeux de societe. Pas de limite stricte mais respecter 1 req/sec.', NULL, 'jour', 1, FALSE, 'bi-dice-5', 'success'),
        ('Open Library', 'ean_lookup', 'openlibrary', 'https://openlibrary.org/api', '["livre"]', 'API gratuite Open Library pour recherche ISBN et livres. Illimite.', NULL, 'jour', 0, FALSE, 'bi-book', 'info'),
        ('Google Books', 'isbn_lookup', 'googlebooks', 'https://www.googleapis.com/books/v1/volumes', '["livre"]', 'API Google Books pour recherche ISBN. Limite: 1000 requetes/jour sans cle.', 1000, 'jour', 1, FALSE, 'bi-google', 'danger'),
        ('TMDB', 'ean_lookup', 'tmdb', 'https://api.themoviedb.org/3', '["film"]', 'API TMDB pour recherche films. Necessite une cle API gratuite.', 1000, 'jour', 0, FALSE, 'bi-film', 'warning'),
        ('MusicBrainz', 'ean_lookup', 'musicbrainz', 'https://musicbrainz.org/ws/2', '["disque"]', 'API gratuite MusicBrainz pour recherche musique. Limite: 1 requete/seconde.', NULL, 'jour', 0, FALSE, 'bi-music-note-beamed', 'purple')
    `);

    console.log('Default API configurations inserted!');

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
    console.log('Dropping configurations_api table...');
    await connection.query('DROP TABLE IF EXISTS configurations_api');
    console.log('Table configurations_api dropped!');
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
  console.log('Usage: node addConfigurationsAPI.js [up|down]');
  process.exit(1);
}
