const sequelize = require('../config/database');
const { generateEmbedding } = require('./openai.service');

/**
 * Perform a semantic (vector similarity) search against legal_resources.
 * Uses cosine distance operator (<=>).
 * Returns the top-K closest legal documents.
 */
async function searchSimilarDocuments(query, topK = 5, category = null) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return fallbackTextSearch(query, topK, category);
    }

    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    let whereClause = '';
    const replacements = { embedding: embeddingStr, limit: topK };

    if (category) {
      whereClause = 'WHERE category = :category';
      replacements.category = category;
    }

    const condition = whereClause
      ? `${whereClause} AND embedding IS NOT NULL`
      : 'WHERE embedding IS NOT NULL';

    const [results] = await sequelize.query(
      `SELECT id, title, category, content, url,
              1 - (embedding <=> :embedding::vector) AS similarity
       FROM legal_resources
       ${condition}
       ORDER BY embedding <=> :embedding::vector
       LIMIT :limit;`,
      { replacements }
    );

    return results;
  } catch (error) {
    return fallbackTextSearch(query, topK, category);
  }
}

/**
 * Fallback full-text search when pgvector is unavailable.
 */
async function fallbackTextSearch(query, topK = 5, category = null) {
  const LegalResource = require('../models/resource.model');
  const { Op } = require('sequelize');

  const where = {
    [Op.or]: [
      { title: { [Op.iLike]: `%${query}%` } },
      { content: { [Op.iLike]: `%${query}%` } },
    ],
  };

  if (category) {
    where.category = category;
  }

  const results = await LegalResource.findAll({
    where,
    limit: topK,
    order: [['createdAt', 'DESC']],
  });

  return results.map(r => r.toJSON());
}

module.exports = {
  searchSimilarDocuments,
  fallbackTextSearch,
};
