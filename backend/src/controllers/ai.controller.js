const ChatMessage = require('../models/chatMessage.model');
const LegalRequest = require('../models/request.model');
const { createStreamingChat } = require('../services/openai.service');
const { searchSimilarDocuments } = require('../services/rag.service');

/**
 * Loads recent history for user, filtering out saved error messages.
 */
async function getCleanChatHistory(userId, currentMessage) {
  let history = [];
  if (userId) {
    try {
      const dbMessages = await ChatMessage.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
        limit: 10,
        attributes: ['role', 'content'],
      });
      history = dbMessages
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content || ''
        }))
        .filter(m => {
          if (!m.content || typeof m.content !== 'string') return false;
          const c = m.content.trim();
          return !c.startsWith('Erreur:') &&
                 !c.startsWith('Error:') &&
                 !c.startsWith('⚠️ Erreur') &&
                 !c.startsWith('Désolé, une erreur');
        });
    } catch (e) {
      console.warn('Failed to load past messages from DB:', e.message);
    }
  }

  if (history.length === 0 || history[history.length - 1].content !== currentMessage) {
    history.push({ role: 'user', content: currentMessage });
  }

  return history;
}

const chat = async (req, res) => {
  const userId = req.user?.id;
  const { message, language } = req.body || {};
  const activeLanguage = language || req.headers['accept-language'] || 'fr';

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Le message est obligatoire" });
  }

  const acceptHeader = req.headers.accept || '';
  const isJsonOnly = acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream');

  // ─── Standard JSON Fallback if requested ────────────────────────
  if (isJsonOnly) {
    try {
      if (userId) {
        ChatMessage.create({ userId, role: 'user', content: message }).catch((e) => {
          console.warn('DB User Message Save Warning:', e.message);
        });
      }
      let contextDocuments = [];
      try {
        contextDocuments = await searchSimilarDocuments(message, 3);
      } catch (e) {
        console.warn('RAG search skipped:', e.message);
      }

      const chatHistory = await getCleanChatHistory(userId, message);
      const stream = createStreamingChat(chatHistory, contextDocuments, activeLanguage);

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk?.choices?.[0]?.delta?.content;
        if (content) fullResponse += content;
      }
      if (userId && fullResponse) {
        try {
          await ChatMessage.create({ userId, role: 'assistant', content: fullResponse });
        } catch (e) {}
      }
      return res.status(200).json({ success: true, response: fullResponse, message: fullResponse });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── Server-Sent Events (SSE) Streaming Branch ──────────────────
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(200);

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let fullResponse = '';

  try {
    // Save user message to database (non-blocking for SSE stream)
    if (userId) {
      ChatMessage.create({ userId, role: 'user', content: message }).catch((e) => {
        console.warn('DB User Message Save Warning:', e.message);
      });
    }

    // Retrieve RAG documents
    let contextDocuments = [];
    try {
      contextDocuments = await searchSimilarDocuments(message, 3);
    } catch (e) {
      console.warn('RAG search skipped:', e.message);
    }

    const chatHistory = await getCleanChatHistory(userId, message);
    const stream = createStreamingChat(chatHistory, contextDocuments, activeLanguage);

    for await (const chunk of stream) {
      const content = chunk?.choices?.[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
        if (typeof res.flush === 'function') {
          res.flush();
        }
      }
    }

    // Save assistant response to DB
    if (userId && fullResponse) {
      try {
        await ChatMessage.create({
          userId,
          role: 'assistant',
          content: fullResponse,
        });
      } catch (dbErr) {
        console.warn('DB Assistant Message Save Warning:', dbErr.message);
      }
    }

    // Signal completion gracefully with double newlines
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Erreur Chat Controller:', error);
    try {
      const errContent = fullResponse
        ? `\n\n[Erreur de connexion: ${error.message}]`
        : `Désolé, une erreur est survenue: ${error.message}`;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: errContent })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (writeErr) {
      console.error('Erreur d’écriture SSE:', writeErr.message);
      res.end();
    }
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const dbMessages = await ChatMessage.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'role', 'content', 'createdAt'],
    });

    const messages = dbMessages.filter(m => {
      if (!m.content || typeof m.content !== 'string') return false;
      const c = m.content.trim();
      return !c.startsWith('Erreur:') &&
             !c.startsWith('Error:') &&
             !c.startsWith('⚠️ Erreur') &&
             !c.startsWith('Désolé, une erreur');
    });

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const clearHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await ChatMessage.destroy({ where: { userId } });
    }
    return res.status(200).json({ success: true, message: "Historique effacé" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Non autorisé" });
    }

    const message = await ChatMessage.findOne({
      where: { id, userId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    await message.destroy();

    return res.status(200).json({
      success: true,
      message: "Message supprimé avec succès",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du message",
      error: error.message,
    });
  }
};

module.exports = { chat, getHistory, clearHistory, deleteMessage };