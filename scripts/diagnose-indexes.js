/**
 * Diagnostic détaillé des index - à exécuter sur la production
 * node scripts/diagnose-indexes.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('=== Diagnostic index MySQL ===\n');
    console.log('Database:', process.env.DB_NAME);

    // Toutes les tables avec leur nombre d'index
    const [rows] = await connection.query(`
      SELECT TABLE_NAME, COUNT(DISTINCT INDEX_NAME) as index_count
      FROM information_schema.statistics
      WHERE table_schema = ?
      GROUP BY TABLE_NAME
      ORDER BY index_count DESC
    `, [process.env.DB_NAME]);

    console.log('\nNombre d\'index par table (top 30):\n');
    
    let problematic = [];
    rows.slice(0, 30).forEach(r => {
      const bar = '█'.repeat(Math.min(r.index_count, 50));
      const warning = r.index_count > 50 ? ' ⚠️ CRITIQUE!' : (r.index_count > 30 ? ' ⚠' : '');
      console.log(`${r.TABLE_NAME.padEnd(40)} ${String(r.index_count).padStart(3)} ${bar}${warning}`);
      
      if (r.index_count > 50) {
        problematic.push(r.TABLE_NAME);
      }
    });

    // Détail des tables problématiques
    if (problematic.length > 0) {
      console.log('\n\n=== TABLES CRITIQUES (> 50 index) ===\n');
      
      for (const table of problematic) {
        console.log(`\n--- ${table} ---`);
        const [indexes] = await connection.query(`
          SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
          FROM information_schema.statistics
          WHERE table_schema = ? AND table_name = ?
          GROUP BY INDEX_NAME, NON_UNIQUE
          ORDER BY INDEX_NAME
        `, [process.env.DB_NAME, table]);
        
        indexes.forEach(idx => {
          const type = idx.NON_UNIQUE === 0 ? 'UNQ' : 'IDX';
          console.log(`  [${type}] ${idx.INDEX_NAME}: ${idx.columns}`);
        });
      }
    }

    // Total
    const total = rows.reduce((sum, r) => sum + r.index_count, 0);
    console.log(`\n\nTotal: ${total} index sur ${rows.length} tables`);

  } finally {
    await connection.end();
  }
}

main().catch(console.error);
