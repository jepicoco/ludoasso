require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('=== Testing MySQL Connection ===');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('');

async function testConnection() {
  const timeout = setTimeout(() => {
    console.error('✗ Connection timeout after 10 seconds');
    process.exit(1);
  }, 10000);

  try {
    console.log('Attempting connection...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 5000
    });

    clearTimeout(timeout);
    console.log('✓ Connection successful!');

    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✓ Query successful:', rows);

    await connection.end();
    console.log('✓ Connection closed');
    process.exit(0);
  } catch (err) {
    clearTimeout(timeout);
    console.error('✗ Connection failed:');
    console.error('Error code:', err.code);
    console.error('Error number:', err.errno);
    console.error('SQL State:', err.sqlState);
    console.error('Message:', err.message);
    process.exit(1);
  }
}

testConnection();
