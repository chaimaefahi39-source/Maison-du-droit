require('dotenv').config();
const { searchSimilarDocuments, fallbackTextSearch } = require('./rag.service');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateEmbedding(text) {
  return null;
}

const legalFunctions = [];

function buildSystemPrompt(contextDocuments = []) {
  let prompt = `أنت مستشار ومساعد قانوني خبير ومتخصص في القانون المغربي (Droit Marocain) لمنصة "Maison du Droit".

مهمتك: الإجابة عن أي استفسار قانوني يطرحه المستخدم وفق نصوص القانون والتشريع المغربي الصارم.
اللغة: أجب بنفس اللغة التي سأل بها المستخدم (الدارجة المغربية، العربية، أو الفرنسية).

الهيكل الإلزامي للجواب:
1. 📌 **الإطار القانوني**: النص القانوني ورقم الفصل بالضبط (القانون الجنائي المغربي، مدونة الشغل 65.99، مدونة الأسرة 70.03، قانون الالتزامات والعقود DOC، قانون الكراء 67.12).
2. 📖 **الشرح والتحليل**: شرح الموقف والحقوق والواجبات ببساطة ووضوح.
3. ⚖️ **المسطرة القانونية خطوة بخطوة**: الإجراءات العملية (المحكمة المختصة، كتابة الضبط، الشرطة، الوثائق المطلوبة، والآجال).
4. ⚠️ **تنبيه**: تذكير بأن هذه المعلومات توجيهية وإرشادية ولا تعوض استشارة وتوكيل محامٍ.

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
 * Guarantees strict user <-> model role alternation ending with user prompt.
 */
function prepareGeminiContents(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  // 1. Filter out error messages and normalize roles
  const cleanMessages = [];
  for (const m of messages) {
    if (!m || !m.content || typeof m.content !== 'string') continue;
    const content = m.content.trim();
    if (!content) continue;

    const isError = /^(Erreur|Error|⚠️ Erreur|Le serveur n'a pas)/i.test(content) ||
                    content.includes('Erreur de connexion') ||
                    content.includes('Erreur Chat Controller');
    if (isError) continue;

    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    cleanMessages.push({ role, content });
  }

  if (cleanMessages.length === 0) return [];

  // 2. Enforce strict alternating sequence (user, model, user, model...)
  const alternated = [];
  for (const msg of cleanMessages) {
    if (alternated.length > 0 && alternated[alternated.length - 1].role === msg.role) {
      alternated[alternated.length - 1] = msg;
    } else {
      alternated.push(msg);
    }
  }

  // 3. Ensure sequence starts with 'user'
  while (alternated.length > 0 && alternated[0].role !== 'user') {
    alternated.shift();
  }

  // 4. Ensure sequence ends with 'user'
  while (alternated.length > 0 && alternated[alternated.length - 1].role !== 'user') {
    alternated.pop();
  }

  if (alternated.length === 0) return [];

  // 5. Convert to Gemini REST API structure
  return alternated.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));
}

/**
 * Universal Database-Driven Fallback Engine
 * Dynamically queries legal_resources DB via RAG search service.
 */
async function generateDatabaseDrivenFallback(userMessage, initialContextDocs = []) {
  let docs = [...(initialContextDocs || [])];

  // If no initial context docs were provided, dynamically search the database
  if (docs.length === 0) {
    try {
      docs = await searchSimilarDocuments(userMessage, 3);
    } catch (e) {
      console.warn('Database dynamic search fallback error:', e.message);
    }
  }

  const query = (userMessage || '').trim();
  const lowerQuery = query.toLowerCase();

  // Determine competent authority & court dynamically based on prompt terms
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
  if (docs.length > 0) {
    dbArticlesSection = `📌 **النصوص والوثائق القانونية المستخرجة من قاعدة البيانات (Legal Resources DB)**:\n`;
    docs.forEach((doc, idx) => {
      dbArticlesSection += `\n**[مورد قانوني ${idx + 1}: ${doc.title || 'تشريع مغربي'}]** (${doc.category || 'عام'})\n${doc.content}\n`;
    });
  } else {
    dbArticlesSection = `📌 **الإطار القانوني العام (Cadre Légal)**:\nيخضع موضوعك لمقتضيات التشريع المغربي النافذ، وفي مقدمته **ظهير الالتزامات والعقود (D.O.C.)** والمساطر القضائية المعمول بها بالمملكة المغربية.`;
  }

  const fullResponse = `### ⚖️ المساعدة والتحليل القانوني

${dbArticlesSection}

📖 **الشرح والتحليل القانوني (Analyse Juridique)**:
بناءً على طلبكم والمتعلق بـ: "${query}"
- توفر النصوص التشريعية المغربية الضمانات الإجرائية والقانونية لحماية الحقوق والمراكز التعاقدية والشخصية.
- يتعين الاعتماد على الحجج الكتابية والمحررات المصادق عليها لإثبات الالتزامات أمام الهيئات القضائية.

⚖️ **الجهة المختصة والمسطرة خطوة بخطوة (Procédure et Autorités Competentes)**:
- **الجهة القضائية/الإدارية المختصة**: **${authorityName}**
${procedureSteps.join('\n')}

⚠️ **تنبيه مهم (Avertissement)**:
تم استخراج هذه المعطيات ديناميكياً بناءً على النصوص والوثائق القانونية المتاحة بقاعدة البيانات التشريعية. هذه الإرشادات توجيهية ولا تغني عن استشارة محامٍ ممارس مقيد بهيئة المحامين بالمغرب.`;

  return fullResponse;
}

/**
 * Async generator function for streaming chat.
 * ALWAYS yields objects in the shape: { choices: [{ delta: { content: string } }] }
 */
async function* createStreamingChat(messages, contextDocuments = []) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // Helper generator to yield text smoothly in small chunks
  async function* streamText(text) {
    if (!text) return;
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const piece = (i === 0 ? '' : ' ') + words[i];
      yield {
        choices: [{ delta: { content: piece }, finish_reason: null }]
      };
      await new Promise(r => setTimeout(r, 15));
    }
    yield {
      choices: [{ delta: {}, finish_reason: 'stop' }]
    };
  }

  // Fallback if GEMINI_API_KEY is not configured
  if (!GEMINI_API_KEY || !GEMINI_API_KEY.trim()) {
    console.info('GEMINI_API_KEY non configurée. Activation du moteur RAG basé sur la base de données.');
    const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments);
    yield* streamText(fallbackText);
    return;
  }

  try {
    const systemInstruction = buildSystemPrompt(contextDocuments);
    const geminiContents = prepareGeminiContents(messages);

    const contentsPayload = geminiContents.length > 0
      ? geminiContents
      : [{ role: 'user', parts: [{ text: lastUserMessage }] }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contentsPayload
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errBody
      });
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      console.error('Gemini API Error:', data.error);
      throw new Error(data.error.message || 'Gemini error');
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText || !replyText.trim()) {
      throw new Error('Gemini response was empty');
    }

    yield* streamText(replyText);

  } catch (err) {
    console.error('Gemini API Error:', err.message || err);
    console.info('Activation du moteur RAG dynamique basé sur la base de données.');
    const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments);
    yield* streamText(fallbackText);
  }
}

async function createChatCompletion(messages, contextDocuments = []) {
  return { message: { content: "" } };
}

module.exports = {
  generateEmbedding,
  createStreamingChat,
  createChatCompletion,
  legalFunctions,
};