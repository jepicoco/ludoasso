/**
 * Migration: Ajouter la table leaderboard_scores pour le mini-jeu
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

async function migrate() {
  try {
    console.log('Connexion a la base de donnees...');
    await sequelize.authenticate();
    console.log('Connexion etablie.');

    // Verifier si la table existe deja
    const [tables] = await sequelize.query(
      "SHOW TABLES LIKE 'leaderboard_scores'"
    );

    if (tables.length > 0) {
      console.log('La table leaderboard_scores existe deja.');
      await sequelize.close();
      return;
    }

    console.log('Creation de la table leaderboard_scores...');

    await sequelize.query(`
      CREATE TABLE leaderboard_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pseudo VARCHAR(5) NOT NULL COMMENT 'Pseudo arcade style (5 lettres max)',
        score INT NOT NULL DEFAULT 0 COMMENT 'Score total',
        temps_secondes INT NOT NULL DEFAULT 0 COMMENT 'Duree de la partie en secondes',
        vies_restantes INT NOT NULL DEFAULT 0 COMMENT 'Nombre de vies restantes a la fin',
        niveau_vitesse INT NOT NULL DEFAULT 1 COMMENT 'Niveau de vitesse atteint',
        friandises_attrapees INT NOT NULL DEFAULT 0 COMMENT 'Nombre total de friandises attrapees',
        ip_address VARCHAR(45) NULL COMMENT 'Adresse IP du joueur (IPv4 ou IPv6)',
        user_agent VARCHAR(500) NULL COMMENT 'User agent du navigateur',
        game_version VARCHAR(10) NOT NULL DEFAULT '1.0' COMMENT 'Version du jeu',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_leaderboard_score (score DESC),
        INDEX idx_leaderboard_created (created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Scores du mini-jeu Pixel Cat Run'
    `);

    console.log('Table leaderboard_scores creee avec succes !');

    await sequelize.close();
    console.log('Migration terminee.');

  } catch (error) {
    console.error('Erreur lors de la migration:', error.message);
    process.exit(1);
  }
}

migrate();
