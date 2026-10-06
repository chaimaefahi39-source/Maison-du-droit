const LegalRequest = require('../models/request.model');
const { analyzeLegalRequest } = require('../services/openai.service');

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Create a new legal request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [travail, logement, famille, commerce, penal, administratif, general] }
 *     responses:
 *       201: { description: Request created }
 */
const createRequest = async (req, res) => {
  try {
    const { title, description, category, language } = req.body;
    const activeLanguage = language || req.headers['accept-language'] || 'fr';
    const userId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Le titre et la description sont obligatoires"
      });
    }

    const request = await LegalRequest.create({
      userId,
      title,
      description,
      category: category || 'general',
      status: 'pending',
    });

    // Initiate and await AI legal analysis immediately upon submission
    try {
      const aiResponseText = await analyzeLegalRequest({
        title,
        description,
        category: category || 'general',
        language: activeLanguage,
      });

      if (aiResponseText && aiResponseText.trim()) {
        request.aiResponse = aiResponseText.trim();
        request.status = 'resolved';
        await request.save();
      }
    } catch (aiErr) {
      console.error("Erreur lors de l'analyse IA de la demande:", aiErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Demande créée et analysée avec succès",
      request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la demande",
      error: error.message,
    });
  }
};

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Get all legal requests for the current user
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of requests }
 */
const getUserRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const requests = await LegalRequest.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des demandes",
      error: error.message,
    });
  }
};

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Get a specific legal request by ID
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Request details }
 */
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await LegalRequest.findOne({
      where: { id, userId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée"
      });
    }

    return res.status(200).json({ success: true, request });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @swagger
 * /api/requests/{id}:
 *   put:
 *     summary: Update a legal request
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Request updated }
 */
const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, category, status } = req.body;

    const request = await LegalRequest.findOne({ where: { id, userId } });
    if (!request) {
      return res.status(404).json({ success: false, message: "Demande non trouvée" });
    }

    if (title !== undefined) request.title = title;
    if (description !== undefined) request.description = description;
    if (category !== undefined) request.category = category;
    if (status !== undefined) request.status = status;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Demande mise à jour avec succès",
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @swagger
 * /api/requests/{id}:
 *   delete:
 *     summary: Delete a legal request by ID
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Request deleted }
 *       404: { description: Request not found }
 */
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await LegalRequest.findOne({
      where: { id, userId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Demande non trouvée",
      });
    }

    await request.destroy();

    return res.status(200).json({
      success: true,
      message: "Demande supprimée avec succès",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la demande",
      error: error.message,
    });
  }
};

module.exports = { createRequest, getUserRequests, getRequestById, updateRequest, deleteRequest };

