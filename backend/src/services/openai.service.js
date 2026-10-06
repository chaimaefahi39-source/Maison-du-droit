require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { searchSimilarDocuments, fallbackTextSearch } = require('./rag.service');

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
let genAI = null;

if (apiKey && !apiKey.includes('=')) {
  genAI = new GoogleGenerativeAI(apiKey);
}

async function generateEmbedding(text) {
  return null;
}

const legalFunctions = [];

/**
 * Builds system prompt with context documents.
 */
function buildSystemPrompt(contextDocuments = []) {
  let prompt = `أنت مستشار ومساعد قانوني خبير ومتخصص في القانون المغربي (Droit Marocain) لمنصة "Maison du Droit".

مهمتك: الإجابة عن أي استفسار قانوني يطرحه المستخدم وفق نصوص القانون والتشريع المغربي الصارم.
اللغة: أجب بنفس اللغة التي سأل بها المستخدم (الدارجة المغربية، العربية، أو الفرنسية).

الهيكل الإلزامي للجواب:
1. 📌 **الإطار القانوني (Cadre Légal)**: النص القانوني ورقم الفصل بالضبط (القانون الجنائي المغربي، مدونة الشغل 65.99، مدونة الأسرة 70.03، قانون الالتزامات والعقود DOC، قانون الكراء 67.12).
2. 📖 **الشرح والتحليل (Analyse Juridique)**: شرح الموقف والحقوق والواجبات ببساطة ووضوح.
3. ⚖️ **المسطرة القانونية خطوة بخطوة (Procédure et Autorités Compétentes)**: الإجراءات العملية (المحكمة المختصة، كتابة الضبط، الشرطة، الوثائق المطلوبة، والآجال).
4. ⚠️ **تنبيه (Avertissement)**: تذكير بأن هذه المعلومات توجيهية وإرشادية ولا تعوض استشارة وتوكيل محامٍ.

Garde-fous: ارفض فوراً أي مساعدة لارتكاب مخالفة أو جريمة.`;

  if (contextDocuments && contextDocuments.length > 0) {
    prompt += `\n\n--- مراجع قانونية مغربية ---\n`;
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

  // Ensure alternating roles ending before the latest turn
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
 * Universal Database-Driven Fallback Engine
 * Dynamically queries legal_resources DB via RAG search service.
 */
async function generateDatabaseDrivenFallback(userMessage, initialContextDocs = []) {
  let docs = [...(initialContextDocs || [])];

  if (docs.length === 0) {
    try {
      docs = await searchSimilarDocuments(userMessage, 3);
    } catch (e) {
      console.warn('Database dynamic search fallback error:', e.message);
      try {
        docs = await fallbackTextSearch(userMessage, 3);
      } catch (err) {
        docs = [];
      }
    }
  }

  const query = (userMessage || '').trim();
  const lowerQuery = query.toLowerCase();

  let authorityName = "المحكمة الإبتدائية المختصة (Tribunal de Première Instance)";
  let procedureSteps = [
    "1. إعداد ملف التظلم والوثائق والمحررات المكتوبة المربطة بالنزاع.",
    "2. التوجه إلى كتابة ضبط المحكمة الإبتدائية التابع لها محل النزاع أو سكنى المدعى عليه.",
    "3. استشارة محامٍ ممارس مسجل بجدول إحدى الهيئات القضائية بالمغرب لمواكبة ملف الدعوى."
  ];

  if (/شغل|طرد|أجر|استقالة|تعويضات|مؤاجر|مشغل|عطلة|نقابة|travail|licenciement|salaire|employeur/i.test(lowerQuery)) {
    authorityName = "مفتشية الشغل و المحكمة الإبتدائية - غرفة القضاء الاجتماعي";
    procedureSteps = [
      "1. تقديم طلب محاولة الصلح التمهيدي أمام السيد مفتش الشغل التابع لمكان العمل داخل أجل 90 يوماً من تاريخ النزاع.",
      "2. في حال عدم الحصول على صلح، إيداع مقال افتتاح دعوى أمام كتابة ضبط الغرفة الاجتماعية بالمحكمة الإبتدائية للمطالبة بالتعويضات المستحقة.",
      "3. الوثائق المطلوبة: عقد الشغل، بيان الأجر (Bulletin de paie)، شهادة العمل، ومحضر الصلح التمهيدي إن وجد."
    ];
  } else if (/زواج|طلاق|نفقة|حضانة|إرث|تركة|أملاك|زوجة|زوج|صداق|شقاق|نسب|mariage|divorce|pension|garde/i.test(lowerQuery)) {
    authorityName = "قسم قضاء الأسرة بالمحكمة الإبتدائية (Tribunal de Famille)";
    procedureSteps = [
      "1. إيداع مقال الدعوى لدى كتابة ضبط قسم قضاء الأسرة بالمحكمة الإبتدائية لمحل إقامة الزوجة أو الزوج.",
      "2. الحضور الشخصي الإجباري لجلسات الصلح القضائية المعينة من طرف القاضي المقرر.",
      "3. الوثائق المطلوبة: رسم الزواج الأصلي، عقود ازدياد الأبناء، شهادة السكنى، ووثائق إثبات الدخل والقدرة المالية."
    ];
  } else if (/شركة|تجارة|سجل تجاري|عقد تجاري|sarl|entreprise|société|création|commerçant|rc/i.test(lowerQuery)) {
    authorityName = "المحكمة التجارية والمركز الجهوي للاستثمار (CRI / OMPIC)";
    procedureSteps = [
      "1. سحب الشهادة السلبية (Certificat Négatif) وإيداع ملف التأسيس عبر المنصة الموحدة للمركز الجهوي للاستثمار.",
      "2. صياغة النظام الأساسي (Statuts) وتأدية الواجبات الضريبية (IF / TP / RC).",
      "3. في حال وجود منازعة تجارية، تقديم المقال الأفتتاحي أمام كتابة ضبط المحكمة التجارية المختصة."
    ];
  } else if (/كراء|سكنى|إفراغ|وجيبة|عقد كراء|ضمانة|مكري|مكتري|bail|loyer|locataire|propriétaire/i.test(lowerQuery)) {
    authorityName = "قاضي المستعجلات والمحكمة الإبتدائية (قانون الكراء 67.12)";
    procedureSteps = [
      "1. توجيه إنذار رسمي بالأداء أو الإفراغ للمكتري بواسطة مفوض قضائي ومنحه المهلة القانونية (15 يوماً).",
      "2. تقديم مقال المصادقة على الإنذار بالإفراغ أمام رئيس المحكمة الإبتدائية بوصفه قاضياً للمستعجلات.",
      "3. الوثائق المطلوبة: عقد الكراء الكتابي المصادق عليه، محاضر الإنذار، وتوصيلات الأداء."
    ];
  } else if (/جريمة|سرقة|نصب|احتيال|ضرب|جرح|تهديد|شكاية|شرطة|قانون جنائي|عقوبة|حبس|سجن|penal|pénal|crime|vol|escroquerie|plainte/i.test(lowerQuery)) {
    authorityName = "النيابة العامة (وكيل الملك / الوكيل العام للملك) والشرطة القضائية";
    procedureSteps = [
      "1. توجيه شكاية كتابية معززة بالحجج والأدلة إلى السيد وكيل الملك لدى المحكمة الإبتدائية أو الوكيل العام لدى محكمة الاستئناف.",
      "2. إحالة الشكاية على مصالح الضابطة القضائية (الشرطة أو الدرك الملكي) للبحث والاستماع لأطراف النزاع.",
      "3. المتابعة القضائية والتنصيب كطرف مدني للمطالبة بالتعويض عن الأضرار اللاحقة."
    ];
  }

  let dbArticlesSection = "";
  if (docs && docs.length > 0) {
    dbArticlesSection = `📌 **النصوص والوثائق القانونية المستخرجة من قاعدة البيانات (Legal Resources DB)**:\n`;
    docs.forEach((doc, idx) => {
      dbArticlesSection += `\n**[مورد قانوني ${idx + 1}: ${doc.title || 'تشريع مغربي'}]** (${doc.category || 'عام'})\n${doc.content}\n`;
    });
  } else {
    dbArticlesSection = `📌 **الإطار القانوني العام (Cadre Légal)**:\nيخضع موضوعك لمقتضيات التشريع المغربي النافذ، وفي مقدمته **ظهير الالتزامات والعقود (D.O.C.)** والمساطر القضائية المعمول بها بالمملكة المغربية.`;
  }

  return `### ⚖️ المساعدة والتحليل القانوني

${dbArticlesSection}

📖 **الشرح والتحليل القانوني (Analyse Juridique)**:
بناءً على طلبكم والمتعلق بـ: "${query}"
- توفر النصوص التشريعية المغربية الضمانات الإجرائية والقانونية لحماية الحقوق والمراكز التعاقدية والشخصية.
- يتعين الاعتماد على الحجج الكتابية والمحررات المصادق عليها لإثبات الالتزامات أمام الهيئات القضائية.

⚖️ **الجهة المختصة والمسطرة خطوة بخطوة (Procédure et Autorités Compétentes)**:
- **الجهة القضائية/الإدارية المختصة**: **${authorityName}**
${procedureSteps.join('\n')}

⚠️ **تنبيه مهم (Avertissement)**:
تم استخراج هذه المعطيات ديناميكياً بناءً على النصوص والوثائق القانونية المتاحة بقاعدة البيانات التشريعية. هذه الإرشادات توجيهية ولا تغني عن استشارة محامٍ ممارس مقيد بهيئة المحامين بالمغرب.`;
}

/**
 * Async generator for streaming chat.
 * ALWAYS yields objects in the shape: { choices: [{ delta: { content: string } }] }
 */
async function* createStreamingChat(messages, contextDocuments = []) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // Helper generator to stream text smoothly chunk by chunk
  async function* streamText(text) {
    if (!text) return;
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const piece = (i === 0 ? '' : ' ') + words[i];
      yield {
        choices: [{ delta: { content: piece }, finish_reason: null }]
      };
      await new Promise(r => setTimeout(r, 12));
    }
    yield {
      choices: [{ delta: {}, finish_reason: 'stop' }]
    };
  }

  if (!genAI) {
    console.warn('GEMINI_API_KEY non configurée. Activation du moteur RAG basé sur la base de données.');
    const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments);
    yield* streamText(fallbackText);
    return;
  }

  // Model candidate priority list
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
  ];

  let lastError = null;
  const systemInstruction = buildSystemPrompt(contextDocuments);

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      // Stream response from Gemini
      const result = await model.generateContentStream(lastUserMessage);

      let chunkCount = 0;
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
        yield {
          choices: [{ delta: {}, finish_reason: 'stop' }]
        };
        return; // Success!
      }
    } catch (err) {
      lastError = err;
      console.error(`Gemini API Error [model: ${modelName}]:`, err.message || err);
      // Continue loop to try next candidate model
    }
  }

  // If all Gemini LLM candidate models fail, fallback seamlessly to Database RAG Engine
  console.error('Gemini API Error: All LLM models failed. Activating Database RAG Fallback.');
  const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments);
  yield* streamText(fallbackText);
}

async function createChatCompletion(messages, contextDocuments = []) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments);
  return { message: { content: fallbackText } };
}

/**
 * Generates a structured AI legal analysis for a submitted legal request.
 */
async function analyzeLegalRequest({ title, description, category }) {
  const query = `${title} ${description}`.trim();

  let contextDocuments = [];
  try {
    contextDocuments = await searchSimilarDocuments(query, 3, category && category !== 'general' ? category : null);
  } catch (e) {
    console.warn('RAG search for legal request analysis skipped:', e.message);
  }

  let contextText = '';
  if (contextDocuments && contextDocuments.length > 0) {
    contextText = contextDocuments.map((doc, idx) => `[Source ${idx + 1}: ${doc.title}]\n${doc.content}`).join('\n\n');
  }

  const prompt = `Vous êtes un conseiller juridique expert en droit marocain pour l'application "Maison du Droit".

Veuillez effectuer une analyse juridique approfondie de la demande suivante :
- **Titre de la demande** : ${title}
- **Catégorie** : ${category || 'général'}
- **Description de la situation** : ${description}

${contextText ? `--- Textes juridiques et références issus de la base de données RAG ---\n${contextText}\n---` : ''}

Rédigez obligatoirement votre réponse en suivant la structure ci-dessous :

1. 📌 **Cadre légal marocain (articles précis)**
Identifiez et citez les textes de loi et articles précis applicables dans le droit marocain (Code du travail loi 65.99, Code pénal, Moudawana / Code de la famille, Dahir des Obligations et Contrats D.O.C., Code de procédure civile, Loi 67.12 sur le bail, etc.).

2. 📖 **Analyse juridique détaillée**
Expliquez la situation en qualifiant juridiquement les faits. Précisez les droits, les obligations et la protection juridique de l'usager.

3. ⚖️ **Démarches pratiques & juridiction compétente**
Indiquez la juridiction compétente (ex: Tribunal de Première Instance - Section de famille / Chambre sociale, Tribunal de Commerce, etc.), les autorités à saisir (Inspecteur du travail, النيابة العامة, etc.), les documents justificatifs nécessaires et la procédure étape par étape.

4. ⚠️ **Avertissement**
Rappelez expressément que cette analyse est délivrée à titre d'information et d'orientation juridique par l'assistant IA et ne remplace pas la consultation d'un avocat inscrit au barreau.`;

  if (genAI) {
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const generatePromise = model.generateContent(prompt);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout for model ${modelName}`)), 10000)
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (err) {
        console.warn(`Gemini API Error [model: ${modelName}]:`, err.message || err);
      }
    }
  }

  console.warn('Gemini API non disponible ou modèles en échec. Utilisation du moteur de secours RAG.');
  return await generateDatabaseDrivenFallback(query, contextDocuments);
}

module.exports = {
  generateEmbedding,
  createStreamingChat,
  createChatCompletion,
  analyzeLegalRequest,
  legalFunctions,
};