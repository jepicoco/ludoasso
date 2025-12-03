require('dotenv').config();
const { sequelize } = require('./backend/models');

console.log('Testing database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

sequelize.authenticate()
  .then(() => {
    console.log('✓ Database connection established successfully');
    return sequelize.sync();
  })
  .then(() => {
    console.log('✓ Models synchronized successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Database connection failed:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  });
