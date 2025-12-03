require('dotenv').config();

console.log('=== Configuration Environment ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('PORT:', process.env.PORT);
console.log('');

console.log('=== Testing Database Connection ===');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log
  }
);

sequelize.authenticate()
  .then(() => {
    console.log('✓ Database connection successful');
    return sequelize.close();
  })
  .then(() => {
    console.log('✓ Test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Database connection failed:');
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    console.error('Errno:', err.errno);
    process.exit(1);
  });
