/**
 * Nettoyage FORCÉ des index dupliqués
 * Supprime TOUS les index dupliqués, gardant seulement le premier trouvé
 *
 * Usage: node scripts/force-cleanup-indexes.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  console.log('=== Nettoyage FORCÉ des index dupliqués ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Récupérer tous les index
    const [allIndexes] = await connection.query(`
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        NON_UNIQUE,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
      FROM information_schema.statistics
      WHERE TABLE_SCHEMA = ?
      GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
      ORDER BY TABLE_NAME, columns, INDEX_NAME
    `, [process.env.DB_NAME]);

    // Grouper par table + colonnes
    const byTableColumns = {};
    for (const idx of allIndexes) {
      const key = `${idx.TABLE_NAME}::${idx.columns}`;
      if (!byTableColumns[key]) {
        byTableColumns[key] = [];
      }
      byTableColumns[key].push(idx);
    }

    let totalDeleted = 0;

    // Pour chaque groupe de doublons
    for (const [key, indexes] of Object.entries(byTableColumns)) {
      if (indexes.length <= 1) continue;

      const [tableName] = key.split('::');

      // Trier: garder PRIMARY en premier, puis UNIQUE, puis le plus court nom
      indexes.sort((a, b) => {
        if (a.INDEX_NAME === 'PRIMARY') return -1;
        if (b.INDEX_NAME === 'PRIMARY') return 1;
        if (a.NON_UNIQUE === 0 && b.NON_UNIQUE === 1) return -1;
        if (a.NON_UNIQUE === 1 && b.NON_UNIQUE === 0) return 1;
        return a.INDEX_NAME.length - b.INDEX_NAME.length;
      });

      // Garder le premier, supprimer les autres
      const toKeep = indexes[0];
      const toDelete = indexes.slice(1);

      for (const idx of toDelete) {
        if (idx.INDEX_NAME === 'PRIMARY') continue;

        try {
          await connection.query(`DROP INDEX \`${idx.INDEX_NAME}\` ON \`${tableName}\``);
          console.log(`✓ ${tableName}: supprimé ${idx.INDEX_NAME} (doublon de ${toKeep.INDEX_NAME})`);
          totalDeleted++;
        } catch (e) {
          console.log(`✗ ${tableName}: erreur ${idx.INDEX_NAME} - ${e.message}`);
        }
      }
    }

    console.log(`\n=== ${totalDeleted} index supprimés ===`);

    // Vérification finale
    console.log('\nVérification finale:\n');
    const [final] = await connection.query(`
      SELECT TABLE_NAME, COUNT(DISTINCT INDEX_NAME) as cnt
      FROM information_schema.statistics
      WHERE TABLE_SCHEMA = ?
      GROUP BY TABLE_NAME
      HAVING cnt > 20
      ORDER BY cnt DESC
      LIMIT 10
    `, [process.env.DB_NAME]);

    final.forEach(r => {
      const status = r.cnt > 50 ? '⚠️ ENCORE TROP' : '✓';
      console.log(`${status} ${r.TABLE_NAME}: ${r.cnt} index`);
    });

  } finally {
    await connection.end();
  }
}

main().catch(console.error);
