const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dialect = process.env.DB_DIALECT || (process.env.DB_HOST ? 'postgres' : 'sqlite');
const logging = process.env.DB_LOGGING === 'true' ? console.log : false;

let sequelize;

if (dialect === 'postgres') {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || 'maison_du_droit_db';
  const username = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || 'password';

  sequelize = new Sequelize(database, username, password, {
    host: host,
    port: port,
    dialect: 'postgres',
    logging: logging,
    define: {
      timestamps: true,
    }
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.join(__dirname, '../../database.sqlite'),
    logging: logging,
    define: {
      timestamps: true,
    }
  });
}

module.exports = sequelize;
