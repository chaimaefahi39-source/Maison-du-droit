const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an embedding vector for a given text using text-embedding-3-small.
 * Returns a 1536-dimensional float array.
 */
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Legal assistant function definitions for OpenAI function calling.
 */
const legalFunctions = [
  {
    type: 'function',
    function: {
      name: 'get_user_requests',
      description: "Récupère la liste des demandes juridiques de l'utilisateur actuel",
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'resolved', 'closed'],
            description: 'Filtrer par statut (optionnel)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_legal_request',
      description: "Crée une nouvelle demande juridique pour l'utilisateur",
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titre court de la demande juridique',
          },
          description: {
            type: 'string',
            description: 'Description détaillée du problème juridique',
          },
          category: {
            type: 'string',
            enum: ['travail', 'logement', 'famille', 'commerce', 'penal', 'administratif', 'general'],
            description: 'Catégorie juridique de la demande',
          },
        },
        required: ['title', 'description', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_legal_resources',
      description: 'Recherche des articles et ressources juridiques pertinents dans la base de données',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Requête de recherche pour trouver des ressources juridiques',
          },
          category: {
            type: 'string',
            description: 'Catégorie pour filtrer les résultats (optionnel)',
          },
        },
        required: ['query'],
      },
    },
  },
];

/**
 * Create a streaming chat completion with function calling capabilities.
 * Returns a readable stream.
 */
async function createStreamingChat(messages, contextDocuments = []) {
  const systemPrompt = buildSystemPrompt(contextDocuments);

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: fullMessages,
    tools: legalFunctions,
    stream: true,
    temperature: 0.3,
    max_tokens: 2048,
  });

  return stream;
}

/**
 * Create a non-streaming chat completion (used after function calls).
 */
async function createChatCompletion(messages, contextDocuments = []) {
  const systemPrompt = buildSystemPrompt(contextDocuments);

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: fullMessages,
    tools: legalFunctions,
    temperature: 0.3,
    max_tokens: 2048,
  });

  return response.choices[0];
}

/**
 * Build the system prompt with injected RAG context documents.
 */
function buildSystemPrompt(contextDocuments = []) {
  let systemPrompt = `Tu es un assistant juridique intelligent de "Maison du Droit", une application d'aide juridique.

Ton rôle est d'aider les utilisateurs à comprendre leurs droits et obligations juridiques.

Règles importantes :
- Tu donnes des informations juridiques générales, pas des conseils juridiques personnalisés.
- Tu précises toujours que tes réponses ne remplacent pas la consultation d'un avocat.
- Tu réponds en français de manière claire et accessible.
- Tu cites les sources juridiques quand c'est pertinent.
- Tu peux utiliser les fonctions disponibles pour aider l'utilisateur (créer des demandes, rechercher des ressources).
- Sois empathique et professionnel.`;

  if (contextDocuments.length > 0) {
    systemPrompt += `\n\n--- DOCUMENTS JURIDIQUES DE RÉFÉRENCE ---\n`;
    contextDocuments.forEach((doc, i) => {
      systemPrompt += `\n[Document ${i + 1}: ${doc.title} | Catégorie: ${doc.category}]\n${doc.content}\n`;
    });
    systemPrompt += `\n--- FIN DES DOCUMENTS ---\n`;
    systemPrompt += `\nUtilise ces documents comme base pour répondre. Cite les documents pertinents dans ta réponse.`;
  }

  return systemPrompt;
}

module.exports = {
  generateEmbedding,
  createStreamingChat,
  createChatCompletion,
  legalFunctions,
};
