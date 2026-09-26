const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
const isApiKeyConfigured = apiKey && apiKey.length > 20 && !apiKey.includes('your-openai-api-key');

const openai = isApiKeyConfigured ? new OpenAI({ apiKey }) : null;

/**
 * Generate an embedding vector for a given text using text-embedding-3-small.
 * Returns a 1536-dimensional float array or null if API key not available.
 */
async function generateEmbedding(text) {
  if (!openai) return null;
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.warn('OpenAI embedding error:', err.message);
    return null;
  }
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
 * Create a streaming chat completion with function calling capabilities or intelligent fallback.
 */
async function createStreamingChat(messages, contextDocuments = []) {
  if (openai) {
    try {
      const systemPrompt = buildSystemPrompt(contextDocuments);
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: fullMessages,
        tools: legalFunctions,
        stream: true,
        temperature: 0.3,
        max_tokens: 2048,
      });

      return stream;
    } catch (err) {
      console.warn('OpenAI stream failed, using fallback assistant engine:', err.message);
    }
  }

  // Fallback streaming generator
  return createFallbackStream(messages, contextDocuments);
}

/**
 * Fallback streaming generator when OpenAI API is unconfigured or unavailable.
 */
async function* createFallbackStream(messages, contextDocuments = []) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const queryLower = lastUserMessage.toLowerCase();

  let responseText = '';

  if (contextDocuments.length > 0) {
    responseText += `Bonjour ! Voici les références juridiques pertinentes relatives à votre demande :\n\n`;
    contextDocuments.forEach((doc, idx) => {
      responseText += `📌 **${doc.title}** (${(doc.category || 'Général').toUpperCase()})\n`;
      responseText += `${doc.content}\n\n`;
    });
    responseText += `💡 *Note : Ces informations sont basées sur les textes juridiques en vigueur. Elles ne remplacent pas la consultation d'un avocat.*`;
  } else if (queryLower.includes('locataire') || queryLower.includes('logement') || queryLower.includes('bail') || queryLower.includes('loyer')) {
    responseText = `En ce qui concerne le **droit du logement** :\n\n` +
      `- **Bail d'habitation** : Le contrat de location fixe la durée (3 ans minimum pour un propriétaire particulier). Le bailleur ne peut donner congé qu'à l'échéance et pour un motif légitime.\n` +
      `- **Trêve hivernale** : Du 1er novembre au 31 mars, aucune expulsion locative ne peut avoir lieu.\n` +
      `- **Garantie & Dépôt** : Le dépôt de garantie est limité à 1 mois de loyer hors charges pour un logement vide.\n\n` +
      `Si vous rencontrez un litige avec votre propriétaire, vous pouvez soumettre une demande détaillée dans la rubrique "Demandes".`;
  } else if (queryLower.includes('travail') || queryLower.includes('licenciement') || queryLower.includes('contrat') || queryLower.includes('employeur')) {
    responseText = `Concernant le **droit du travail** :\n\n` +
      `- **Contrat de travail** : Le CDI est la règle générale. Le CDD ne s'applique que pour des missions temporaires et précises.\n` +
      `- **Licenciement** : L'employeur doit justifier d'un motif réel et sérieux et respecter la procédure (entretien préalable, lettre recommandée, préavis).\n` +
      `- **Indemnités** : Une indemnité de licenciement est due à partir de 8 mois d'ancienneté.\n\n` +
      `Vous pouvez consulter les détails complets dans notre rubrique "Ressources".`;
  } else if (queryLower.includes('divorce') || queryLower.includes('garde') || queryLower.includes('famille') || queryLower.includes('enfant')) {
    responseText = `En matière de **droit de la famille** :\n\n` +
      `- **Divorce** : Peut être prononcé par consentement mutuel (devant notaire avec 2 avocats) ou par voie judiciaire devant le juge aux affaires familiales (JAF).\n` +
      `- **Garde des enfants** : La résidence peut être fixée chez l'un des parents ou en alternance, en fonction de l'intérêt supérieur de l'enfant.\n` +
      `- **Pension alimentaire** : Fixée selon les revenus des parents et les besoins de l'enfant.`;
  } else {
    responseText = `Bonjour ! Je suis l'assistant juridique virtuel de **Maison du Droit**.\n\n` +
      `Je suis à votre disposition pour vous orienter et vous informer sur vos droits :\n\n` +
      `• 💼 **Droit du travail** (Contrats, licenciement, congés, droits du salarié)\n` +
      `• 🏠 **Droit du logement** (Bail, loyer, expulsion, droits du locataire)\n` +
      `• 👨‍👩‍👧 **Droit de la famille** (Divorce, garde d'enfants, pension alimentaire)\n` +
      `• 🏛️ **Droit administratif & commercial**\n\n` +
      `Posez-moi votre question ou décrivez votre situation !`;
  }

  const words = responseText.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunkText = (i === 0 ? '' : ' ') + words[i];
    yield {
      choices: [
        {
          delta: { content: chunkText },
          finish_reason: i === words.length - 1 ? 'stop' : null,
        },
      ],
    };
    await new Promise((r) => setTimeout(r, 20));
  }
}

/**
 * Create a non-streaming chat completion (used after function calls).
 */
async function createChatCompletion(messages, contextDocuments = []) {
  if (openai) {
    try {
      const systemPrompt = buildSystemPrompt(contextDocuments);
      const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: fullMessages,
        tools: legalFunctions,
        temperature: 0.3,
        max_tokens: 2048,
      });

      return response.choices[0];
    } catch (err) {
      console.warn('OpenAI completion failed:', err.message);
    }
  }

  return {
    message: {
      content: "Merci pour votre question. Pour toute démarche juridique approfondie, vous pouvez également créer une demande dans l'application.",
    },
  };
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
