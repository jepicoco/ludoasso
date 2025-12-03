require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('=== Testing MySQL Connection with Auth Plugin ===');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);
console.log('');

async function testConnection() {
  const configs = [
    {
      name: 'Default config',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000
      }
    },
    {
      name: 'With mysql_native_password',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 5000,
        authPlugins: {
          mysql_native_password: () => () => {
            const crypto = require('crypto');
            return (data) => {
              const token = data.slice(0, 20);
              const hash = crypto.createHash('sha1')
                .update(process.env.DB_PASSWORD)
                .digest();
              const hash2 = crypto.createHash('sha1')
                .update(hash)
                .digest();
              const hash3 = crypto.createHash('sha1')
                .update(Buffer.concat([token, hash2]))
                .digest();

              const result = Buffer.alloc(hash.length);
              for (let i = 0; i < hash.length; i++) {
                result[i] = hash[i] ^ hash3[i];
              }
              return result;
            };
          }
        }
      }
    },
    {
      name: 'Without database selection',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 5000
      }
    }
  ];

  for (const {name, config} of configs) {
    console.log(`\nTrying: ${name}`);
    console.log('─'.repeat(50));

    try {
      const connection = await mysql.createConnection(config);
      console.log('✓ Connection successful!');

      const [rows] = await connection.execute('SELECT VERSION() as version, CURRENT_USER() as user');
      console.log('✓ MySQL Version:', rows[0].version);
      console.log('✓ Connected as:', rows[0].user);

      if (config.database) {
        const [dbRows] = await connection.execute('SELECT DATABASE() as db');
        console.log('✓ Database:', dbRows[0].db);
      }

      await connection.end();
      console.log('✓ This configuration works!\n');
      return config;
    } catch (err) {
      console.error('✗ Failed with this config');
      console.error('  Error code:', err.code);
      console.error('  Message:', err.message);
    }
  }

  console.log('\n✗ All configurations failed');
  process.exit(1);
}

testConnection()
  .then(() => {
    console.log('\n=== Test completed ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
