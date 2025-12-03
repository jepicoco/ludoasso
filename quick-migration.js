/**
 * Migration rapide via requête SQL directe
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Executing migration...');
        await connection.query(`
            ALTER TABLE adherents
            ADD COLUMN adhesion_association TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'Adhérent est-il membre de l\\'association'
        `);
        console.log('✓ Migration successful!');
    } catch (error) {
        if (error.errno === 1060) {
            console.log('⚠️  Column already exists');
        } else {
            throw error;
        }
    } finally {
        await connection.end();
    }
}

migrate().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
