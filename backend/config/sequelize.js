const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      connectTimeout: 10000, // 10 seconds timeout for initial connection
      // Support for mysql_native_password authentication plugin
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
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false,
      underscored: false
    }
  }
);

module.exports = sequelize;
