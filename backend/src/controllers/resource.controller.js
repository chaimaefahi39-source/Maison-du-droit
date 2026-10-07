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
const mapResourceLanguage = (item, lang) => {
  const plain = item.toJSON ? item.toJSON() : { ...item };
  const targetLang = (lang || '').toLowerCase();

  let title = plain.title;
  let content = plain.content;

  if (targetLang === 'fr' && plain.titleFr) {
    title = plain.titleFr;
    content = plain.contentFr || plain.content;
  } else if (targetLang === 'en' && plain.titleEn) {
    title = plain.titleEn;
    content = plain.contentEn || plain.content;
  }

  return {
    ...plain,
    title,
    content,
  };
};

const getResources = async (req, res) => {
  try {
    const { q, category, semantic, lang: queryLang } = req.query;
    const lang = queryLang || req.headers['accept-language'] || 'ar';

    // Semantic search path
    if (q && semantic === 'true') {
      const results = await searchSimilarDocuments(q, 10, category || null);
      const mapped = results.map(r => mapResourceLanguage(r, lang));
      return res.status(200).json({ success: true, resources: mapped });
    }

    // Standard text search
    const where = {};
    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { content: { [Op.iLike]: `%${q}%` } },
        { titleFr: { [Op.iLike]: `%${q}%` } },
        { contentFr: { [Op.iLike]: `%${q}%` } },
        { titleEn: { [Op.iLike]: `%${q}%` } },
        { contentEn: { [Op.iLike]: `%${q}%` } },
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

    const mappedResources = resources.map(r => mapResourceLanguage(r, lang));

    return res.status(200).json({ success: true, resources: mappedResources });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche de ressources",
      error: error.message,
    });
  }
};

const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || req.headers['accept-language'] || 'ar';
    const resource = await LegalResource.findByPk(id);
    if (!resource) {
      return res.status(404).json({ success: false, message: "Ressource non trouvée" });
    }
    return res.status(200).json({ success: true, resource: mapResourceLanguage(resource, lang) });
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
