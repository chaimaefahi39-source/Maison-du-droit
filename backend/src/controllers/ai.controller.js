const ChatMessage = require('../models/chatMessage.model');
const LegalRequest = require('../models/request.model');
const { createStreamingChat } = require('../services/openai.service');
const { searchSimilarDocuments } = require('../services/rag.service');

const chat = async (req, res) => {
  const userId = req.user.id;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Le message est obligatoire" });
  }

  // ضبط ترويسات SSE مع دعم كامل لـ CORS
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'X-Accel-Buffering': 'no',
  });

  try {
    // حفظ رسالة المستخدم في قاعدة البيانات
    await ChatMessage.create({ userId, role: 'user', content: message });

    // استرجاع وثائق الـ RAG ذات الصلة
    let contextDocuments = [];
    try {
      contextDocuments = await searchSimilarDocuments(message, 3);
    } catch (e) {
      console.warn('RAG search skipped:', e.message);
    }

    // استدعاء البث المباشر
    const stream = await createStreamingChat([{ role: 'user', content: message }], contextDocuments);

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
      }
    }

    // حفظ جواب المساعد في قاعدة البيانات
    if (fullResponse) {
      await ChatMessage.create({
        userId,
        role: 'assistant',
        content: fullResponse,
      });
    }

    // إشعار انتهاء البث بنجاح
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Erreur Chat Controller:', error);
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: `\nعذراً، حدث خطأ: ${error.message}` })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await ChatMessage.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'role', 'content', 'createdAt'],
    });
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const clearHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    await ChatMessage.destroy({ where: { userId } });
    return res.status(200).json({ success: true, message: "Historique effacé" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { chat, getHistory, clearHistory };