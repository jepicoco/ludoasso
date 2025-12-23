/**
 * Migration: Add structure_id to genre limit tables
 *
 * Permet de configurer les limites par genre par structure.
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // === LimiteEmpruntGenre ===
  const empruntColumns = await queryInterface.describeTable('limites_emprunt_genre');

  if (!empruntColumns.structure_id) {
    console.log('Ajout de structure_id a limites_emprunt_genre...');
    await sequelize.query(`
      ALTER TABLE limites_emprunt_genre
      ADD COLUMN structure_id INT NULL
      COMMENT 'ID de la structure (null = global)'
      AFTER id
    `);

    // Ajouter foreign key
    await sequelize.query(`
      ALTER TABLE limites_emprunt_genre
      ADD CONSTRAINT fk_limite_emprunt_genre_structure
      FOREIGN KEY (structure_id) REFERENCES structures(id)
      ON DELETE CASCADE
    `);

    // Supprimer l'ancien index unique
    try {
      await sequelize.query(`
        ALTER TABLE limites_emprunt_genre
        DROP INDEX limites_emprunt_genre_module_genre_id
      `);
    } catch (e) {
      // Index peut ne pas exister
      console.log('Index limites_emprunt_genre_module_genre_id non trouve');
    }

    // Creer nouvel index unique incluant structure_id
    await sequelize.query(`
      CREATE UNIQUE INDEX idx_limite_emprunt_genre_unique
      ON limites_emprunt_genre (structure_id, module, genre_id)
    `);
  }

  // === LimiteReservationGenre ===
  const reservationColumns = await queryInterface.describeTable('limites_reservation_genre');

  if (!reservationColumns.structure_id) {
    console.log('Ajout de structure_id a limites_reservation_genre...');
    await sequelize.query(`
      ALTER TABLE limites_reservation_genre
      ADD COLUMN structure_id INT NULL
      COMMENT 'ID de la structure (null = global)'
      AFTER id
    `);

    // Ajouter foreign key
    await sequelize.query(`
      ALTER TABLE limites_reservation_genre
      ADD CONSTRAINT fk_limite_reservation_genre_structure
      FOREIGN KEY (structure_id) REFERENCES structures(id)
      ON DELETE CASCADE
    `);

    // Supprimer l'ancien index unique
    try {
      await sequelize.query(`
        ALTER TABLE limites_reservation_genre
        DROP INDEX limites_reservation_genre_module_genre_id
      `);
    } catch (e) {
      // Index peut ne pas exister
      console.log('Index limites_reservation_genre_module_genre_id non trouve');
    }

    // Creer nouvel index unique incluant structure_id
    await sequelize.query(`
      CREATE UNIQUE INDEX idx_limite_reservation_genre_unique
      ON limites_reservation_genre (structure_id, module, genre_id)
    `);
  }

  console.log('Migration structure_id genre limits terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  // LimiteEmpruntGenre
  try {
    await sequelize.query(`ALTER TABLE limites_emprunt_genre DROP FOREIGN KEY fk_limite_emprunt_genre_structure`);
    await sequelize.query(`ALTER TABLE limites_emprunt_genre DROP INDEX idx_limite_emprunt_genre_unique`);
    await queryInterface.removeColumn('limites_emprunt_genre', 'structure_id');
  } catch (e) {
    console.log('Rollback limites_emprunt_genre:', e.message);
  }

  // LimiteReservationGenre
  try {
    await sequelize.query(`ALTER TABLE limites_reservation_genre DROP FOREIGN KEY fk_limite_reservation_genre_structure`);
    await sequelize.query(`ALTER TABLE limites_reservation_genre DROP INDEX idx_limite_reservation_genre_unique`);
    await queryInterface.removeColumn('limites_reservation_genre', 'structure_id');
  } catch (e) {
    console.log('Rollback limites_reservation_genre:', e.message);
  }
}

module.exports = { up, down };
