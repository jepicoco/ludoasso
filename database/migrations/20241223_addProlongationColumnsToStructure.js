/**
 * Migration: Add prolongation columns per module to parametres_front_structure
 * Enables per-structure configuration of prolongation settings
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const tableInfo = await queryInterface.describeTable('parametres_front_structure');

  const columnsToAdd = [
    // Ludotheque
    { name: 'prolongation_active_ludotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Prolongations actives (ludotheque)' },
    { name: 'prolongation_jours_ludotheque', type: 'INTEGER', defaultValue: 14, comment: 'Jours par prolongation (ludotheque)' },
    { name: 'prolongation_auto_max_ludotheque', type: 'INTEGER', defaultValue: 1, comment: 'Prolongations auto max (ludotheque)' },
    { name: 'prolongation_manuelle_ludotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Demandes manuelles autorisees (ludotheque)' },
    { name: 'prolongation_msg_reservation_ludotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Avertissement reservation (ludotheque)' },

    // Bibliotheque
    { name: 'prolongation_active_bibliotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Prolongations actives (bibliotheque)' },
    { name: 'prolongation_jours_bibliotheque', type: 'INTEGER', defaultValue: 14, comment: 'Jours par prolongation (bibliotheque)' },
    { name: 'prolongation_auto_max_bibliotheque', type: 'INTEGER', defaultValue: 1, comment: 'Prolongations auto max (bibliotheque)' },
    { name: 'prolongation_manuelle_bibliotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Demandes manuelles autorisees (bibliotheque)' },
    { name: 'prolongation_msg_reservation_bibliotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Avertissement reservation (bibliotheque)' },

    // Filmotheque
    { name: 'prolongation_active_filmotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Prolongations actives (filmotheque)' },
    { name: 'prolongation_jours_filmotheque', type: 'INTEGER', defaultValue: 7, comment: 'Jours par prolongation (filmotheque)' },
    { name: 'prolongation_auto_max_filmotheque', type: 'INTEGER', defaultValue: 1, comment: 'Prolongations auto max (filmotheque)' },
    { name: 'prolongation_manuelle_filmotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Demandes manuelles autorisees (filmotheque)' },
    { name: 'prolongation_msg_reservation_filmotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Avertissement reservation (filmotheque)' },

    // Discotheque
    { name: 'prolongation_active_discotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Prolongations actives (discotheque)' },
    { name: 'prolongation_jours_discotheque', type: 'INTEGER', defaultValue: 7, comment: 'Jours par prolongation (discotheque)' },
    { name: 'prolongation_auto_max_discotheque', type: 'INTEGER', defaultValue: 1, comment: 'Prolongations auto max (discotheque)' },
    { name: 'prolongation_manuelle_discotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Demandes manuelles autorisees (discotheque)' },
    { name: 'prolongation_msg_reservation_discotheque', type: 'BOOLEAN', defaultValue: true, comment: 'Avertissement reservation (discotheque)' }
  ];

  for (const col of columnsToAdd) {
    if (!tableInfo[col.name]) {
      console.log(`Adding column ${col.name}...`);
      if (col.type === 'BOOLEAN') {
        await queryInterface.addColumn('parametres_front_structure', col.name, {
          type: sequelize.Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: col.defaultValue,
          comment: col.comment
        });
      } else if (col.type === 'INTEGER') {
        await queryInterface.addColumn('parametres_front_structure', col.name, {
          type: sequelize.Sequelize.INTEGER,
          allowNull: false,
          defaultValue: col.defaultValue,
          comment: col.comment
        });
      }
    } else {
      console.log(`Column ${col.name} already exists, skipping...`);
    }
  }

  console.log('Migration completed: prolongation columns added to parametres_front_structure');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const columnsToDrop = [
    'prolongation_active_ludotheque', 'prolongation_jours_ludotheque', 'prolongation_auto_max_ludotheque',
    'prolongation_manuelle_ludotheque', 'prolongation_msg_reservation_ludotheque',
    'prolongation_active_bibliotheque', 'prolongation_jours_bibliotheque', 'prolongation_auto_max_bibliotheque',
    'prolongation_manuelle_bibliotheque', 'prolongation_msg_reservation_bibliotheque',
    'prolongation_active_filmotheque', 'prolongation_jours_filmotheque', 'prolongation_auto_max_filmotheque',
    'prolongation_manuelle_filmotheque', 'prolongation_msg_reservation_filmotheque',
    'prolongation_active_discotheque', 'prolongation_jours_discotheque', 'prolongation_auto_max_discotheque',
    'prolongation_manuelle_discotheque', 'prolongation_msg_reservation_discotheque'
  ];

  for (const col of columnsToDrop) {
    try {
      await queryInterface.removeColumn('parametres_front_structure', col);
      console.log(`Dropped column ${col}`);
    } catch (e) {
      console.log(`Column ${col} may not exist, skipping...`);
    }
  }
}

module.exports = { up, down };
