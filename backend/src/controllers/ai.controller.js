const ChatMessage = require('../models/chatMessage.model');
const LegalRequest = require('../models/request.model');
const { createStreamingChat, createChatCompletion } = require('../services/openai.service');
const { searchSimilarDocuments } = require('../services/rag.service');

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with the AI legal assistant (SSE streaming)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, description: "User's message" }
 *     responses:
 *       200:
 *         description: SSE stream of assistant response chunks
 *         content:
 *           text/event-stream: {}
 */
const chat = async (req, res) => {
  const userId = req.user.id;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Le message est obligatoire" });
  }

  // ─── Set up SSE headers ───────────────────────────────────────
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  try {
    // ─── Save user message to DB ───────────────────────────────
    await ChatMessage.create({ userId, role: 'user', content: message });

    // ─── Retrieve conversation history (last 20 messages) ──────
    const history = await ChatMessage.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
      limit: 20,
      attributes: ['role', 'content'],
    });

    const messages = history.map(m => ({ role: m.role, content: m.content }));

    // ─── RAG: retrieve relevant documents ──────────────────────
    let contextDocuments = [];
    try {
      contextDocuments = await searchSimilarDocuments(message, 3);
    } catch (e) {
      console.warn('RAG search failed, proceeding without context:', e.message);
    }

    // ─── Create streaming completion ───────────────────────────
    const stream = await createStreamingChat(messages, contextDocuments);

    let fullResponse = '';
    let functionCallName = '';
    let functionCallArgs = '';
    let isCollectingFunctionCall = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      // Handle function call chunks
      if (delta?.tool_calls) {
        isCollectingFunctionCall = true;
        const toolCall = delta.tool_calls[0];
        if (toolCall.function?.name) {
          functionCallName = toolCall.function.name;
        }
        if (toolCall.function?.arguments) {
          functionCallArgs += toolCall.function.arguments;
        }
        continue;
      }

      // Handle text content chunks
      if (delta?.content) {
        fullResponse += delta.content;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta.content })}\n\n`);
      }

      // Handle completion with function call
      if (finishReason === 'tool_calls' && isCollectingFunctionCall) {
        res.write(`data: ${JSON.stringify({ type: 'function_call', name: functionCallName })}\n\n`);

        // Execute the function call
        const functionResult = await executeFunctionCall(userId, functionCallName, functionCallArgs);

        // Add function result to messages and get final response
        messages.push({ role: 'assistant', content: null, tool_calls: [{
          id: 'call_1',
          type: 'function',
          function: { name: functionCallName, arguments: functionCallArgs }
        }]});
        messages.push({
          role: 'tool',
          tool_call_id: 'call_1',
          content: JSON.stringify(functionResult),
        });

        // Get follow-up response after function call (non-streaming for simplicity)
        const followUp = await createChatCompletion(messages, contextDocuments);
        const followUpContent = followUp.message?.content || '';

        if (followUpContent) {
          fullResponse += followUpContent;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: followUpContent })}\n\n`);
        }
      }
    }

    // ─── Save assistant response to DB ─────────────────────────
    if (fullResponse) {
      await ChatMessage.create({
        userId,
        role: 'assistant',
        content: fullResponse,
        metadata: isCollectingFunctionCall ? { functionCall: functionCallName } : null,
      });
    }

    // ─── Send completion event ─────────────────────────────────
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('AI Chat error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Execute a function call from the AI and return the result.
 */
async function executeFunctionCall(userId, functionName, argsString) {
  let args;
  try {
    args = JSON.parse(argsString);
  } catch {
    args = {};
  }

  switch (functionName) {
    case 'get_user_requests': {
      const where = { userId };
      if (args.status) where.status = args.status;
      const requests = await LegalRequest.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 10,
      });
      return {
        success: true,
        count: requests.length,
        requests: requests.map(r => ({
          id: r.id,
          title: r.title,
          category: r.category,
          status: r.status,
          createdAt: r.createdAt,
        })),
      };
    }

    case 'create_legal_request': {
      const request = await LegalRequest.create({
        userId,
        title: args.title,
        description: args.description,
        category: args.category || 'general',
      });
      return {
        success: true,
        message: 'Demande créée avec succès',
        request: {
          id: request.id,
          title: request.title,
          category: request.category,
          status: request.status,
        },
      };
    }

    case 'search_legal_resources': {
      const results = await searchSimilarDocuments(args.query, 5, args.category || null);
      return {
        success: true,
        count: results.length,
        resources: results.map(r => ({
          title: r.title,
          category: r.category,
          content: r.content?.substring(0, 300) + '...',
        })),
      };
    }

    default:
      return { success: false, message: `Fonction inconnue: ${functionName}` };
  }
}

/**
 * @swagger
 * /api/ai/history:
 *   get:
 *     summary: Get chat history for the current user
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Chat history }
 */
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

/**
 * @swagger
 * /api/ai/history:
 *   delete:
 *     summary: Clear chat history for the current user
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: History cleared }
 */
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
