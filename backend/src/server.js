require('dotenv').config();
const app = require('./app');
const db = require('./models');
const { Client } = require('pg');

const { seedResources } = require('./seed');

const PORT = process.env.PORT || 5001;

async function startServer() {
  if (process.env.DB_DIALECT === 'postgres') {
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME || 'maison_du_droit_db';
    const username = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || process.env.DB_PASS || 'password';

    try {
      const client = new Client({ host, port, user: username, password, database: 'postgres' });
      await client.connect();
      const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [database]);
      if (res.rowCount === 0) {
        await client.query(`CREATE DATABASE "${database}"`);
        console.log(`Database "${database}" created successfully.`);
      }
      await client.end();
    } catch (err) {
      console.warn('Postgres database auto-creation check skipped:', err.message);
    }
  }

  try {
    await db.sequelize.sync({ alter: true });
    console.log('Database connected and synced successfully.');

    // Seed resources if missing
    await seedResources();

    // Set up pgvector extension and embedding column
    await db.setupPgVector();

    app.listen(PORT, () => {
      console.log(`\n🏛️  Maison du Droit API running on port ${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🔗 Health:   http://localhost:${PORT}/\n`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  }
}

startServer();
