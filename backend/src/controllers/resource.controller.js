const LegalResource = require('../models/resource.model');
const { searchSimilarDocuments } = require('../services/rag.service');
const { Op } = require('sequelize');

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Get legal resources with optional text or semantic search
 *     tags: [Resources]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: semantic
 *         schema: { type: boolean }
 *         description: Use vector similarity search (requires pgvector + OPENAI_API_KEY)
 *     responses:
 *       200: { description: List of resources }
 */
const getResources = async (req, res) => {
  try {
    const { q, category, semantic } = req.query;

    // Semantic search path
    if (q && semantic === 'true') {
      const results = await searchSimilarDocuments(q, 10, category || null);
      return res.status(200).json({ success: true, resources: results });
    }

    // Standard text search
    const where = {};
    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { content: { [Op.iLike]: `%${q}%` } },
      ];
    }
    if (category) {
      where.category = category;
    }

    const resources = await LegalResource.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({ success: true, resources });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche de ressources",
      error: error.message,
    });
  }
};

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     summary: Get a single resource by ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Resource details }
 */
const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await LegalResource.findByPk(id);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Ressource non trouvée" });
    }
    return res.status(200).json({ success: true, resource });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @swagger
 * /api/resources/categories:
 *   get:
 *     summary: Get all distinct resource categories
 *     tags: [Resources]
 *     responses:
 *       200: { description: Category list }
 */
const getCategories = async (req, res) => {
  try {
    const categories = await LegalResource.findAll({
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('category')), 'category']],
      raw: true,
    });
    return res.status(200).json({
      success: true,
      categories: categories.map(c => c.category),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getResources, getResourceById, getCategories };
