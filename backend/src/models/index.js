const sequelize = require('../config/database');
const User = require('./user.model');
const LegalRequest = require('./request.model');
const LegalResource = require('./resource.model');
const ChatMessage = require('./chatMessage.model');

// ─── Associations ──────────────────────────────────────────────
User.hasMany(LegalRequest, { foreignKey: 'userId', as: 'requests' });
LegalRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ─── pgvector setup (runs after sync) ──────────────────────────
async function setupPgVector() {
  try {
    // Enable the pgvector extension
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('pgvector extension enabled.');

    // Add the embedding column if it doesn't exist (1536 dimensions for text-embedding-3-small)
    const [results] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'legal_resources' AND column_name = 'embedding';
    `);

    if (results.length === 0) {
      await sequelize.query(`
        ALTER TABLE legal_resources ADD COLUMN embedding vector(1536);
      `);
      console.log('Added embedding vector column to legal_resources.');
    }

    // Create an IVFFlat index for fast approximate nearest neighbor search
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS legal_resources_embedding_idx
      ON legal_resources
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 10);
    `).catch(() => {
      // Index creation may fail if not enough rows; that's okay on first boot
      console.log('Vector index creation deferred (need more data rows).');
    });
  } catch (err) {
    console.warn('pgvector setup skipped (not using PostgreSQL or extension unavailable):', err.message);
  }
}

const db = {
  sequelize,
  User,
  LegalRequest,
  LegalResource,
  ChatMessage,
  setupPgVector,
};

module.exports = db;
