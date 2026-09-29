const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
const isApiKeyConfigured = apiKey && apiKey.length > 20 && !apiKey.includes('your-openai-api-key');

const openai = isApiKeyConfigured ? new OpenAI({ apiKey }) : null;

/**
 * توليد متجه الـ Embedding للنصوص
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
 * تعريف دوال الـ Function Calling
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
 * بناء الـ System Prompt المعتمد على القانون المغربي ومستندات الـ RAG
 */
function buildSystemPrompt(contextDocuments = []) {
  let prompt = `أنت مساعد قانوني ذكي وخبير متخصص حصرياً في القانون المغربي (Droit Marocain) لمنصة "Maison du Droit".

مهمتك: توجيه المواطنين والمستخدمين وتقديم الحلول الإجرائية والنصوص القانونية الدقيقة وفق التشريع المغربي.
اللغات المدعومة: تفهم الدارجة المغربية بطلاقة، واللغة العربية الفصحى، والفرنسية. تجيب دائماً بنفس اللغة التي سأل بها المستخدم.

هيكل الإجابة الإلزامي:
1. 📌 **الإطار القانوني والنصوص المطبقة (Le Cadre Légal)**: اذكر رقم الفصل والقانون المعني بدقة (مثال: الفصل 505 من القانون الجنائي، مدونة الشغل الظهير 1.03.194، مدونة الأسرة القانون 70.03، قانون الكراء 67.12).
2. 📖 **الشرح والتحليل**: شرح المقتضى القانوني بطريقة مبسطة يفهمها المواطن العادي.
3. ⚖️ **المسطرة والإجراءات المتبعة خطوة بخطوة (La Procédure)**: إلى أين يتوجه المستخدم عملياً (الدائرة الأمنية/الدرك، مفتشية الشغل، كتابة الضبط بالمحكمة الابتدائية)، والوثائق المطلوبة، والآجال القانونية.
4. ⚠️ **تنبيه وإخلاء مسؤولية**: تذكير بأن هذه الإجابة توجيهية وإعلامية ولا تعوض استشارة وتوكيل محامٍ مسجل بالهيئة.

حدودك: ارفض فوراً أي طلب يهدف إلى مخالفة القانون أو الإفلات من العقاب أو تزوير الوثائق.`;

  if (contextDocuments.length > 0) {
    prompt += `\n\n--- مراجع قانونية مغربية مستخرجة من قاعدة البيانات (RAG Context) ---\n`;
    contextDocuments.forEach((doc, idx) => {
      prompt += `\n[مرجع ${idx + 1}: ${doc.title} (${doc.category})]\n${doc.content}\n`;
    });
    prompt += `\n--- نهاية المراجع ---`;
    prompt += `\nاعتمد على هذه المراجع المغربية الرسمية في بناء جوابك والاستشهاد بها.`;
  }

  return prompt;
}

/**
 * البث المباشر للإجابة (Streaming)
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
        temperature: 0.2,
        max_tokens: 2048,
      });

      return stream;
    } catch (err) {
      console.warn('OpenAI streaming failed, falling back to local engine:', err.message);
    }
  }

  return createFallbackStream(messages, contextDocuments);
}

/**
 * محرك التوجيه القانوني المحلي الذكي (عند عدم توفر مفتاح OpenAI)
 */
async function* createFallbackStream(messages, contextDocuments = []) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const q = lastUserMessage.toLowerCase();

  let response = '';

  // 1. إذا عثر الـ RAG على نصوص متطابقة من قاعدة البيانات
  if (contextDocuments.length > 0 && (contextDocuments[0].similarity > 0.4 || !openai)) {
    const topDoc = contextDocuments[0];
    response = `بناءً على المقتضيات القانونية المعمول بها في التشريع المغربي:\n\n` +
      `📌 **${topDoc.title}**\n` +
      `${topDoc.content}\n\n` +
      `⚖️ **المسطرة القانونية الموصى بها:**\n` +
      `1. تحضير كافة الإثباتات والوثائق التي تثبت الواقعة موضوع النزاع.\n` +
      `2. إيداع الشكاية أو الطلب لدى الجهة المختصة (المحكمة الابتدائية أو الإدارة المعنية).\n` +
      `3. يمكنك تسجيل هذه القضية مباشرة من قسم "Demandes" في التطبيق لتتبع الإجراءات.\n\n` +
      `⚠️ *تنبيه: هذه المعلومات ذات صبغة إرشادية وتوجيهية فقط ولا تغني عن استشارة محامٍ مرخص.*`;
  } 
  // 2. قضايا السرقة والجرائم الجنائية
  else if (q.includes('vol') || q.includes('volé') || q.includes('sr9a') || q.includes('ser9a') || q.includes('سرقة') || q.includes('سريقة') || q.includes('chffar')) {
    response = `📌 **الإطار القانوني (القانون الجنائي المغربي):**\n` +
      `وفقاً لمقتضيات **الفصل 505 وما يليه من مجموعة القانون الجنائي المغربي**، تُعرّف السرقة بأنها اختلاس مال منقول مملوك للغير بنية تملكه، ويعاقب عليها القانون بالحبس من سنة إلى 5 سنوات، وتتحول إلى جناية مشددة (الفصول 507-509) إذا تمت بالكسر، أو ليلاً، أو بتعدد الجناة أو باستعمال السلاح.\n\n` +
      `⚖️ **المسطرة القانونية الواجب اتباعها عملياً:**\n` +
      `1. **التبليغ الفوري:** التوجه فوراً إلى أقرب مركز شرطة (الأمن الوطني بالمدينة) أو مركز الدرك الملكي (في القرى ومشارف المدن).\n` +
      `2. **تحرير محضر شكاية رسمي:** الإدلاء بكافة تفاصيل الحادث، قائمة المسروقات، وأوصاف المشتبه بهم إن وجدت، مع طلب وصل إيداع ورقم المحضر وتاريخه.\n` +
      `3. **المتابعة لدى النيابة العامة:** يحال المحضر بعد انتهاء البحث التمهيدي على وكيل الملك بالمحكمة الابتدائية، مع إمكانية الانتصاب كمطالب بالحق المدني للمطالبة باسترجاع المسروقات والتعويض عن الضرر.\n\n` +
      `⚠️ *تنبيه: هذا التوجيه إعلامي، ويُنصح بمتابعة الشكاية أو توكيل محامٍ في حال تشعب الملف.*`;
  }
  // 3. قضايا الكراء والسكن والنزاعات الإيجارية
  else if (q.includes('locataire') || q.includes('logement') || q.includes('bail') || q.includes('loyer') || q.includes('kré') || q.includes('kra') || q.includes('كراء') || q.includes('إفراغ')) {
    response = `📌 **الإطار القانوني (قانون الكراء السكني والمهني - القانون رقم 67.12):**\n` +
      `ينظم **القانون 67.12** العلاقة بين المكري والمكتري في المغرب، ويفرض صراحة ضرورة إبرام عقد كراء كتابي مصحح الإمضاء وتثبيت حالة الأمكنة.\n\n` +
      `⚖️ **أبرز الحقوق والمساطر المقررة:**\n` +
      `1. **حماية المكتري من الإفراغ التعسفي:** لا يمكن للمكري إفراغ المكتري إلا لأسباب قانونية حصرية (التماطل في الأداء، الهدم لإعادة البناء، أو استرجاع المحل للسكن الشخصي).\n` +
      `2. **مسطرة الإنذار المسبق:** يُلزم القانون المكري بتوجيه إنذار رسمي بواسطة مفوض قضائي مع منح أجل 15 يوماً في حالة عدم أداء الوجيبة، أو 3 أشهر في حالة الاسترجاع للسكنى.\n` +
      `3. **الطعن أمام القضاء:** لا يتم الإفراغ إلا بصدور حكم قضائي مصادق عليه من رئيس المحكمة الابتدائية أو قاضي المستعجلات.\n\n` +
      `⚠️ *تنبيه: الإفراغ دون إذن قضائي أو قطع الماء والكهرباء يعد فعلاً معاقباً عليه قانوناً.*`;
  }
  // 4. قضايا العمل والنزاعات العمالية والطرد
  else if (q.includes('travail') || q.includes('licenciement') || q.includes('tard') || q.includes('khdma') || q.includes('choghl') || q.includes('طرد') || q.includes('شغل') || q.includes('خدمة')) {
    response = `📌 **الإطار القانوني (مدونة الشغل المغربية - القانون رقم 65.99):**\n` +
      `تحدد مقتضيات **المواد 35 و41 و53 و62 من مدونة الشغل** الضمانات القانونية للأجراء، وتعتبر أي فصل لا يستند إلى خطأ جسيم ثابتاً طرداً تعسفياً يعطي الحق في التعويض.\n\n` +
      `⚖️ **المسطرة القانونية الواجب اتباعها:**\n` +
      `1. **احترام مسطرة الاستماع (المادة 62):** يجب على المشغل الاستماع للأجير بحضور مندوب الأجراء داخل أجل 8 أيام من تاريخ ثبوت الخطأ قبل اتخاذ أي مقرر بالفصل.\n` +
      `2. **اللجوء إلى مفتشية الشغل:** التوجه إلى مفتش الشغل التابع للدائرة الترابية لفتح مسطرة الصلح التمهيدي واستدعاء المشغل.\n` +
      `3. **رفع دعوى الفصل التعسفي:** في حال فشل الصلح التحريري، يجب رفع دعوى أمام قسم قضاء النزاعات الاجتماعية بالمحكمة الابتدائية داخل أجل لا يتعدى 90 يوماً للمطالبة بالتعويضات (الإخطار، الفصل، والضرر).\n\n` +
      `⚠️ *تنبيه: التوجيه إعلامي ولا يعوض خدمات المحامي المتخصص في قضايا الشغل.*`;
  }
  // 5. قضايا الأسرة والطلاق والنفقة
  else if (q.includes('divorce') || q.includes('famille') || q.includes('talaq') || q.includes('chiqaq') || q.includes('نفقة') || q.includes('طلاق') || q.includes('شقاق') || q.includes('حضانة')) {
    response = `📌 **الإطار القانوني (مدونة الأسرة المغربية - القانون رقم 70.03):**\n` +
      `تنظم **المواد 94 إلى 97 من مدونة الأسرة** دعوى التطليق للشقاق، وهو إجراء يتيح لأحد الزوجين أو كلاهما طلب إنهاء العلاقة الزوجية عند استحكام الخلاف.\n\n` +
      `⚖️ **المسطرة والإجراءات القضائية:**\n` +
      `1. **تقديم مقال افتتاحي للدعوى:** يُودع المقال لدى قسم قضاء الأسرة بالمحكمة الابتدائية المختصة مكانياً.\n` +
      `2. **جلسات الصلح الإلزامية:** تعقد المحكمة جلسة أو جلستين لمحاولة التوفيق، ويمكنها تكليف حكمين أو مجلس العائلة للإصلاح.\n` +
      `3. **الحكم وتحديد المستحقات:** في حال تعذر الصلح، تقضي المحكمة بالطلاق وتلزم الزوج بإيداع مستحقات الزوجة والأبناء بصندوق المحكمة (المتعة، العدة، السكنى، ونفقة الأطفال وحضانتهم طبقاً للمادتين 84 و85) في أجل أقصاه 30 يوماً.\n\n` +
      `⚠️ *تنبيه: قضايا الأسرة تتطلب استشارة محامٍ لتحديد مبالغ المستحقات بدقة.*`;
  }
  // 6. الاستقبال العام
  else {
    response = `مرحباً بك في منصة **Maison du Droit** للمساعدة القانونية المغربية 🇲🇦.\n\n` +
      `يمكنني إرشادك وتحديد النصوص والمساطر المتبعة في:\n\n` +
      `• 💼 **مدونة الشغل** (نزاعات العقود، الطرد التعسفي، التعويضات القانونية)\n` +
      `• 🏠 **قانون الكراء السكني والمهني** (حقوق المكتري، التماطل، مساطر الإفراغ)\n` +
      `• ⚖️ **القانون الجنائي والمساطر الجنائية** (الشكايات، السرقات، النيابة العامة والمحاكم)\n` +
      `• 👨‍👩‍👧 **مدونة الأسرة** (الطلاق، الشقاق، النفقة، الحضانة)\n` +
      `• 🏛️ **القانون التجاري والإداري** (المعاملات التجارية وحماية المستهلك)\n\n` +
      `تفضل بطرح استفسارك بالتفصيل وسأقدم لك الإطار القانوني والمسطرة خطوة بخطوة.`;
  }

  const words = response.split(' ');
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
    await new Promise((r) => setTimeout(r, 18));
  }
}

/**
 * دالة الإكمال غير المباشر بعد تنفيذ الوظائف
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
        temperature: 0.2,
        max_tokens: 2048,
      });

      return response.choices[0];
    } catch (err) {
      console.warn('OpenAI completion failed:', err.message);
    }
  }

  return {
    message: {
      content: "تمت معالجة الإجراء المطلوب بنجاح، يمكنك متابعة التفاصيل في شاشة الطلبات أو الموارد.",
    },
  };
}

// ─── Exportations obligatoires ─────────────────────────────────
module.exports = {
  generateEmbedding,
  createStreamingChat,
  createChatCompletion,
  legalFunctions,
};