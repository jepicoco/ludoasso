/**
 * Migration: Ajouter le contexte (organisation/structure/groupe) aux parametres codes-barres
 *
 * Permet de stocker des parametres differents selon le mode de gestion configure
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Adding context columns to parametres_codes_barres...');

  // Verifier si les colonnes existent deja
  const tableDesc = await queryInterface.describeTable('parametres_codes_barres');

  // Ajouter organisation_id
  if (!tableDesc.organisation_id) {
    await queryInterface.addColumn('parametres_codes_barres', 'organisation_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'organisations', key: 'id' },
      onDelete: 'CASCADE'
    });
    console.log('  - Added organisation_id column');
  }

  // Ajouter structure_id
  if (!tableDesc.structure_id) {
    await queryInterface.addColumn('parametres_codes_barres', 'structure_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'structures', key: 'id' },
      onDelete: 'CASCADE'
    });
    console.log('  - Added structure_id column');
  }

  // Ajouter groupe_id
  if (!tableDesc.groupe_id) {
    await queryInterface.addColumn('parametres_codes_barres', 'groupe_id', {
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'organisation_barcode_groups', key: 'id' },
      onDelete: 'CASCADE'
    });
    console.log('  - Added groupe_id column');
  }

  // Supprimer l'index unique sur module seul
  try {
    await queryInterface.removeIndex('parametres_codes_barres', 'module');
    console.log('  - Removed unique index on module');
  } catch (e) {
    // Index n'existe peut-etre pas
  }

  // Ajouter un index unique sur la combinaison (module, organisation_id, structure_id, groupe_id)
  try {
    await queryInterface.addIndex('parametres_codes_barres',
      ['module', 'organisation_id', 'structure_id', 'groupe_id'],
      {
        unique: true,
        name: 'idx_pcb_module_context'
      }
    );
    console.log('  - Added unique index on (module, organisation_id, structure_id, groupe_id)');
  } catch (e) {
    console.log('  - Index already exists or error:', e.message);
  }

  // Ajouter des index individuels pour les recherches
  try {
    await queryInterface.addIndex('parametres_codes_barres', ['organisation_id'], { name: 'idx_pcb_org' });
    await queryInterface.addIndex('parametres_codes_barres', ['structure_id'], { name: 'idx_pcb_struct' });
    await queryInterface.addIndex('parametres_codes_barres', ['groupe_id'], { name: 'idx_pcb_groupe' });
    console.log('  - Added individual indexes');
  } catch (e) {
    // Index existent peut-etre deja
  }

  console.log('Migration completed successfully');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Removing context columns from parametres_codes_barres...');

  // Supprimer les index
  try {
    await queryInterface.removeIndex('parametres_codes_barres', 'idx_pcb_module_context');
    await queryInterface.removeIndex('parametres_codes_barres', 'idx_pcb_org');
    await queryInterface.removeIndex('parametres_codes_barres', 'idx_pcb_struct');
    await queryInterface.removeIndex('parametres_codes_barres', 'idx_pcb_groupe');
  } catch (e) {
    // Ignorer si les index n'existent pas
  }

  // Supprimer les colonnes
  const tableDesc = await queryInterface.describeTable('parametres_codes_barres');

  if (tableDesc.groupe_id) {
    await queryInterface.removeColumn('parametres_codes_barres', 'groupe_id');
  }
  if (tableDesc.structure_id) {
    await queryInterface.removeColumn('parametres_codes_barres', 'structure_id');
  }
  if (tableDesc.organisation_id) {
    await queryInterface.removeColumn('parametres_codes_barres', 'organisation_id');
  }

  // Remettre l'index unique sur module
  try {
    await queryInterface.addIndex('parametres_codes_barres', ['module'], { unique: true });
  } catch (e) {
    // Ignorer
  }

  console.log('Rollback completed');
}

module.exports = { up, down };
