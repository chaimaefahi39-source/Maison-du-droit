require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
console.log("Gemini Key exists?:", !!process.env.GEMINI_API_KEY, "Starts with:", process.env.GEMINI_API_KEY?.substring(0, 7));

let genAI = null;
if (apiKey && !apiKey.includes('=')) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ GoogleGenerativeAI Client initialized successfully.');
  } catch (e) {
    console.error('Gemini Initialization Error:', e);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY is missing in environment variables.');
}

async function generateEmbedding(text) {
  return null;
}

const legalFunctions = [];

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

/**
 * Builds system prompt with context documents and strict language enforcement.
/**
 * Builds system prompt with context documents and strict language enforcement.
 * Enforces: ULTRA-SHORT, direct, telegraphic answers (2 to 4 short lines maximum).
 * No introductory sentences, no boilerplate, no disclaimers, no suggestions.
 */
function buildSystemPrompt(contextDocuments = [], language = 'fr', userMessage = '') {
  let lang = language;
  // If user message is in Arabic, automatically answer in Arabic
  if (userMessage && /[\u0600-\u06FF]/.test(userMessage)) {
    lang = 'ar';
  }
  const langCode = (lang || 'fr').toLowerCase();
  
  let langInstruction = "Tu dois obligatoirement formuler toute ta réponse en Français clair, direct et ultra-court.";
  if (langCode === 'ar') {
    langInstruction = "يجب أن تصيغ كامل الإجابة باللغة العربية الفصحى بصيغة فائقة القصر والإيجاز المباشر.";
  } else if (langCode === 'en') {
    langInstruction = "You must formulate the entire response strictly in clear, direct and ultra-short English according to Moroccan Law.";
  }

  let prompt = `أنت مساعد قانوني ذكي وموجز جداً لمنصة "Maison du Droit" (القانون المغربي).

⚡⚡ **القاعدة الأساسية الإلزامية: إجابة فائقة الإيجاز ومباشرة (ULTRA-SHORT & CONCISE)** ⚡⚡
- **الطول الإلزامي**: ما بين **سطرين إلى 4 أسطر مقتضبة جداً كحد أقصى** (أو 2 إلى 3 نقاط تلغرافية قصيرة). لا تتجاوز 40-50 كلمة إجمالاً.
- **ممنوع منعاً باتاً**:
  ❌ أي مقدمة أو جملة تمهيدية (مثل: "وفق القانون المغربي المتعلق بـ..." أو "في إطار القانون...").
  ❌ أي شروحات إنشائية أو فقرات مطولة.
  ❌ أي تنبيهات أو تحذيرات أو خواتم (مثل "تنبيه: لا يغني عن محام...").
  ❌ أي اقتراح لمواضيع أو أسئلة أخرى إطلاقاً.
- **الشكل الإلزامي للجواب**:
  1. ابدأ فوراً بالنص القانوني ورقم الفصل وضعه بين علامتي نجمة **ليظهر بارزاً**.
  2. اذكر الحكم القانوني أو الشروط الأساسية في 2 إلى 3 نقاط مقتضبة وسريعة جداً.
  3. ضع الكلمات المفتاحية الأساسية فقط (أرقام الفصول، الآجال، العقوبات، المحكمة) بين **نجمتين** لتظهر بخط عريض وواضح.

📌 **تكييف الإطار القانوني حسب موضوع السؤال**:
- الجرائم / القتل / السرقة / النصب ➔ **القانون الجنائي المغربي**
- الأسرة / الزواج / الطلاق / النفقة ➔ **مدونة الأسرة**
- الشغل / الطرد التعسفي / الأجر ➔ **مدونة الشغل**
- الكراء / العقارات ➔ **قانون الكراء 67.12**
- العقود والديون والبيع ➔ **ظهير الالتزامات والعقود (D.O.C.)**
- الشركات والتجارة ➔ **مدونة التجارة**

📌 **RÈGLE OBLIGATOIRE DE LANGUE / STRICT LANGUAGE**:
${langInstruction}

Garde-fous: Refuser toute complicité ou conseil pour commettre une infraction.`;

  if (contextDocuments && contextDocuments.length > 0) {
    prompt += `\n\n--- مراجع وثائق قاعدة البيانات القانونية المغربية ---\n`;
    contextDocuments.forEach((doc, idx) => {
      prompt += `\n[وثيقة ${idx + 1}: ${doc.title}]\n${doc.content}\n`;
    });
  }
  return prompt;
}

/**
 * Sanitizes and prepares message history for Gemini API.
 */
function prepareGeminiHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const clean = [];
  for (const m of messages) {
    if (!m || !m.content || typeof m.content !== 'string') continue;
    const content = m.content.trim();
    if (!content) continue;

    const isError = /^(Erreur|Error|⚠️ Erreur|Le serveur n'a pas)/i.test(content) ||
                    content.includes('Erreur de connexion') ||
                    content.includes('Erreur Chat Controller') ||
                    content.includes('Erreur Gemini');
    if (isError) continue;

    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    clean.push({ role, parts: [{ text: content }] });
  }

  const alternated = [];
  for (const msg of clean) {
    if (alternated.length > 0 && alternated[alternated.length - 1].role === msg.role) {
      alternated[alternated.length - 1] = msg;
    } else {
      alternated.push(msg);
    }
  }

  while (alternated.length > 0 && alternated[0].role !== 'user') {
    alternated.shift();
  }

  return alternated;
}

/**
 * Async generator for streaming chat directly with Gemini API using dynamic fallback chain.
 * NO HARDCODED FALLBACK TEMPLATES.
 */
async function* createStreamingChat(messages, contextDocuments = [], language = 'fr') {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  if (!genAI) {
    const errText = "Erreur Gemini: GEMINI_API_KEY n'est pas configurée dans le fichier .env";
    console.error("CRITICAL GEMINI ERROR:", errText);
    yield { choices: [{ delta: { content: errText }, finish_reason: 'stop' }] };
    return;
  }

  const systemInstruction = buildSystemPrompt(contextDocuments, language, lastUserMessage);
  const formattedHistory = prepareGeminiHistory(messages.slice(0, -1));
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    let chunkCount = 0;
    try {
      console.log(`🤖 Attempting Gemini model: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      const chatSession = model.startChat({
        history: formattedHistory,
      });

      const result = await chatSession.sendMessageStream(lastUserMessage);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          chunkCount++;
          yield {
            choices: [{ delta: { content: text }, finish_reason: null }]
          };
        }
      }

      if (chunkCount > 0) {
        console.log(`✅ Success streaming from Gemini model: ${modelName}`);
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }]
        };
        return; // Success!
      }
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Gemini model ${modelName} failed (${err.status || err.message}). ${chunkCount > 0 ? 'Stream ended after partial output' : 'Trying next candidate...'}`);
      if (chunkCount > 0) {
        yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
        return;
      }
    }
  }

  console.error("CRITICAL GEMINI ERROR: All candidate models failed.", lastError);
  const errText = `Erreur Gemini: ${lastError ? (lastError.message || lastError.toString()) : 'All Gemini models failed'}`;
  yield { choices: [{ delta: { content: errText }, finish_reason: 'stop' }] };
}

async function createChatCompletion(messages, contextDocuments = [], language = 'fr') {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  return { message: { content: "Erreur Gemini: Streaming required" } };
}

/**
 * Generates structured AI legal analysis using Gemini API fallback chain without mock templates.
 */
async function analyzeLegalRequest({ title, description, category, language = 'fr' }) {
  const query = `${title} ${description}`.trim();
  const langCode = (language || 'fr').toLowerCase();

  let contextDocuments = [];
  try {
    const { searchSimilarDocuments } = require('./rag.service');
    contextDocuments = await searchSimilarDocuments(query, 3, category && category !== 'general' ? category : null);
  } catch (e) {
    console.warn('RAG search for legal request analysis skipped:', e.message);
  }

  let contextText = '';
  if (contextDocuments && contextDocuments.length > 0) {
    contextText = contextDocuments.map((doc, idx) => `[Source ${idx + 1}: ${doc.title}]\n${doc.content}`).join('\n\n');
  }

  let langInstruction = "Tu dois obligatoirement formuler toute ta réponse, l'analyse juridique et les démarches en Français.";
  if (langCode === 'ar') {
    langInstruction = "يجب أن تصيغ كامل الإجابة والتحليل القانوني والإجراءات باللغة العربية الفصحى الواضحة حصراً.";
  } else if (langCode === 'en') {
    langInstruction = "You must formulate the entire response, legal analysis, and procedural steps strictly in English, according to Moroccan Law.";
  }

  const prompt = `Vous êtes un conseiller juridique expert en droit marocain pour l'application "Maison du Droit".

Veuillez effectuer une analyse juridique approfondie de la demande suivante :
- **Titre de la demande** : ${title}
- **Catégorie** : ${category || 'général'}
- **Description de la situation** : ${description}

📌 **RÈGLE STRICTE DE LANGUE / STRICT LANGUAGE RULE**:
${langInstruction}

${contextText ? `--- Textes juridiques et références issus de la base de données RAG ---\n${contextText}\n---` : ''}

Rédigez obligatoirement votre réponse en suivant la structure ci-dessous :

1. 📌 **Cadre légal marocain (articles précis)**
Identifiez et citez les textes de loi et articles précis applicables dans le droit marocain.

2. 📖 **Analyse juridique détaillée**
Expliquez la situation en qualifiant juridiquement les faits. Précisez les droits, les obligations et la protection juridique de l'usager.

3. ⚖️ **Démarches pratiques & juridiction compétente**
Indiquez la juridiction compétente, les autorités à saisir, les documents justificatifs nécessaires et la procédure étape par étape.

4. ⚠️ **Avertissement**
Rappelez expressément que cette analyse est délivrée à titre d'information et d'orientation juridique par l'assistant IA et ne remplace pas la consultation d'un avocat inscrit au barreau.`;

  if (!genAI) {
    throw new Error("GEMINI_API_KEY n'est pas configurée dans le fichier .env");
  }

  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`🤖 Attempting analyzeLegalRequest with model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const generatePromise = model.generateContent(prompt);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout for model ${modelName}`)), 12000)
      );

      const result = await Promise.race([generatePromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Model ${modelName} failed for analyzeLegalRequest: ${err.message}`);
    }
  }

  throw new Error(`Erreur Gemini: ${lastError ? (lastError.message || lastError.toString()) : 'All Gemini models failed'}`);
}

module.exports = {
  generateEmbedding,
  createStreamingChat,
  createChatCompletion,
  analyzeLegalRequest,
  legalFunctions,
};