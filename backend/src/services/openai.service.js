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
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro-latest',
  'gemini-pro-latest',
  'gemini-3.8-flash',
];

/**
 * Builds system prompt with context documents and strict language enforcement.
 */
function buildSystemPrompt(contextDocuments = [], language = 'fr') {
  const langCode = (language || 'fr').toLowerCase();
  
  let langInstruction = "Tu dois obligatoirement formuler toute ta réponse, l'analyse juridique et les démarches en Français.";
  if (langCode === 'ar') {
    langInstruction = "يجب أن تصيغ كامل الإجابة والتحليل القانوني والإجراءات باللغة العربية الفصحى الواضحة حصراً.";
  } else if (langCode === 'en') {
    langInstruction = "You must formulate the entire response, legal analysis, and procedural steps strictly in English, according to Moroccan Law.";
  }

  let prompt = `أنت مستشار ومساعد قانوني خبير ومتخصص في القانون المغربي (Droit Marocain) لمنصة "Maison du Droit".

مهمتك: الإجابة عن أي استفسار قانوني يطرحه المستخدم وفق نصوص التشريع والقانون المغربي الدقيقة.

📌 **تكييف الإطار القانوني حسب موضوع السؤال (DYNAMIC LEGAL DOMAIN MATCHING)**:
- إذا كان السؤال عن **الجرائم / القتل العمد / الضرب / السرقة / النصب / الاعتداء** ➔ استشهد بـ **القانون الجنائي المغربي (Code Pénal Marocain)** (مثلاً: القتل العمد = الفصل 392 وما بعده، الإعدام أو السجن المؤبد، وغرفة الجنايات بمحكمة الاستئناف والنيابة العامة). لا تستشهد أبداً بقانون الالتزامات والعقود DOC في الجرائم!
- إذا كان السؤال عن **الأسرة / الزواج / الطلاق / النفقة / الحضانة** ➔ استشهد بـ **مدونة الأسرة (Moudawana - قانون 70.03)** وقسم قضاء الأسرة.
- إذا كان السؤال عن **الشغل / الطرد التعسفي / الأجر** ➔ استشهد بـ **مدونة الشغل (قانون 65.99)** ومفتشية الشغل والغرفة الاجتماعية.
- إذا كان السؤال عن **الكراء / العقارات** ➔ استشهد بـ **قانون الكراء 67.12** ورئيس المحكمة كقاضي المستعجلات.
- إذا كان السؤال عن **العقود والالتزامات والديون والبيع والشراء** ➔ استشهد بـ **ظهير الالتزامات والعقود (D.O.C.)**.
- إذا كان السؤال عن **الشركات والمعاملات التجارية** ➔ استشهد بـ **مدونة التجارة وقانون الشركات والمحكمة التجارية**.

📌 **RÈGLE OBLIGATOIRE DE LANGUE / STRICT LANGUAGE ENFORCEMENT**:
${langInstruction}

الهيكل الإلزامي للجواب:
1. 📌 **Cadre Légal / الإطار القانوني**: النص القانوني ورقم الفصل بالضبط فـ القانون المغربي المتعلق بموضوع السؤال.
2. 📖 **Analyse Juridique / الشرح والتحليل**: شرح الموقف والمسؤولية والحقوق ببساطة ووضوح.
3. ⚖️ **Procédure et Autorités Compétentes / المسطرة والجهة المختصة**: الإجراءات العملية (المحكمة المختصة بالضبط، المساطر، والوثائق).
4. ⚠️ **Avertissement / تنبيه**: تذكير بأن هذه المعلومات توجيهية وإرشادية ولا تعوض استشارة وتوكيل محامٍ.

Garde-fous: Refusez immédiatement toute assistance pour commettre une جناية أو جريمة أو مخالفة للقانون.`;

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

  const systemInstruction = buildSystemPrompt(contextDocuments, language);
  const formattedHistory = prepareGeminiHistory(messages.slice(0, -1));
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    let chunkCount = 0;
    try {
      console.log(`🤖 Attempting Gemini model: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
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