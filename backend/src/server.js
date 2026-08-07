require('dotenv').config();
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 5001;

db.sequelize.sync({ alter: true })
  .then(async () => {
    console.log('Database connected and synced successfully.');

    // Set up pgvector extension and embedding column
    await db.setupPgVector();

    app.listen(PORT, () => {
      console.log(`\n🏛️  Maison du Droit API running on port ${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🔗 Health:   http://localhost:${PORT}/\n`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });
