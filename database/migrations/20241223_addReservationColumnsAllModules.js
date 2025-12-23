/**
 * Migration: Add reservation columns for all modules
 *
 * Les colonnes de reservation n'existaient que pour ludotheque.
 * Cette migration ajoute les colonnes manquantes pour bibliotheque, filmotheque, discotheque.
 */

const { sequelize } = require('../../backend/models');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  // Verifier les colonnes existantes
  const columns = await queryInterface.describeTable('parametres_front');

  const modules = ['bibliotheque', 'filmotheque', 'discotheque'];

  const columnsToAdd = [
    { prefix: 'limite_reservation_', type: 'INTEGER', default: 2, comment: 'Limite de reservations actives' },
    { prefix: 'limite_reservation_nouveaute_', type: 'INTEGER', default: 0, comment: 'Limite reservations nouveautes (0=non reservable)' },
    { prefix: 'reservation_expiration_jours_', type: 'INTEGER', default: 15, comment: 'Jours pour recuperer apres notification' },
    { prefix: 'reservation_active_', type: 'BOOLEAN', default: true, comment: 'Reservations actives pour ce module' }
  ];

  for (const mod of modules) {
    for (const col of columnsToAdd) {
      const colName = col.prefix + mod;
      if (!columns[colName]) {
        console.log(`Ajout de ${colName}...`);
        if (col.type === 'BOOLEAN') {
          await sequelize.query(`
            ALTER TABLE parametres_front
            ADD COLUMN ${colName} BOOLEAN DEFAULT ${col.default}
            COMMENT '${col.comment}'
          `);
        } else {
          await sequelize.query(`
            ALTER TABLE parametres_front
            ADD COLUMN ${colName} INTEGER DEFAULT ${col.default}
            COMMENT '${col.comment}'
          `);
        }
      }
    }
  }

  console.log('Migration reservation columns terminee');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  const modules = ['bibliotheque', 'filmotheque', 'discotheque'];
  const prefixes = ['limite_reservation_', 'limite_reservation_nouveaute_', 'reservation_expiration_jours_', 'reservation_active_'];

  for (const mod of modules) {
    for (const prefix of prefixes) {
      const colName = prefix + mod;
      try {
        await queryInterface.removeColumn('parametres_front', colName);
      } catch (e) {
        // Ignore si colonne n'existe pas
      }
    }
  }
}

module.exports = { up, down };
