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

مهمتك: الإجابة عن أي استفسار قانوني يطرحه المستخدم وفق نصوص القانون والتشريع المغربي الصارم.

📌 **RÈGLE OBLIGATOIRE DE LANGUE / STRICT LANGUAGE ENFORCEMENT**:
${langInstruction}

الهيكل الإلزامي للجواب:
1. 📌 **Cadre Légal / الإطار القانوني**: النص القانوني ورقم الفصل بالضبط (القانون الجنائي المغربي، مدونة الشغل 65.99، مدونة الأسرة 70.03، قانون الالتزامات والعقود DOC، قانون الكراء 67.12).
2. 📖 **Analyse Juridique / الشرح والتحليل**: شرح الموقف والحقوق والواجبات ببساطة ووضوح.
3. ⚖️ **Procédure et Autorités Compétentes / المسطرة والجهة المختصة**: الإجراءات العملية (المحكمة المختصة، كتابة الضبط، الشرطة، الوثائق المطلوبة، والآجال).
4. ⚠️ **Avertissement / تنبيه**: تذكير بأن هذه المعلومات توجيهية وإرشادية ولا تعوض استشارة وتوكيل محامٍ.

Garde-fous: Refusez immédiatement toute assistance pour commettre une infraction ou un crime.`;

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
async function generateDatabaseDrivenFallback(userMessage, initialContextDocs = [], language = 'fr') {
  let docs = [...(initialContextDocs || [])];
  const langCode = (language || 'fr').toLowerCase();

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

  if (langCode === 'ar') {
    let authorityName = "المحكمة الإبتدائية المختصة (Tribunal de Première Instance)";
    let procedureSteps = [
      "1. إعداد ملف التظلم والوثائق والمحررات المكتوبة المرتبطة بالنزاع.",
      "2. التوجه إلى كتابة ضبط المحكمة الإبتدائية التابع لها محل النزاع أو سكنى المدعى عليه.",
      "3. استشارة محامٍ ممارس مسجل بجدول إحدى الهيئات القضائية بالمغرب لمواكبة ملف الدعوى."
    ];

    if (/شغل|طرد|أجر|استقالة|تعويضات|مؤاجر|مشغل|عطلة|نقابة|travail|licenciement|salaire|employeur/i.test(lowerQuery)) {
      authorityName = "مفتشية الشغل والمحكمة الإبتدائية - غرفة القضاء الاجتماعي";
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
        "3. في حال وجود منازعة تجارية، تقديم المقال الافتتاحي أمام كتابة ضبط المحكمة التجارية المختصة."
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

  } else if (langCode === 'en') {
    let authorityName = "Competent Court of First Instance (Tribunal de Première Instance)";
    let procedureSteps = [
      "1. Prepare a complete case file with signed documents and evidence regarding the dispute.",
      "2. File the initial complaint at the registry of the Court of First Instance having territorial jurisdiction.",
      "3. Consult a practicing lawyer admitted to the Moroccan Bar to guide your proceedings."
    ];

    if (/travail|licenciement|salaire|employeur|labor|work|job|termination|employer|employee/i.test(lowerQuery)) {
      authorityName = "Labor Inspection & Court of First Instance - Social Division";
      procedureSteps = [
        "1. File an attempt for preliminary conciliation with the Labor Inspector within 90 days of the dispute.",
        "2. If conciliation fails, file a formal lawsuit at the Social Division of the Court of First Instance.",
        "3. Required documents: Employment contract, pay slips (Bulletin de paie), work certificate, conciliation minutes."
      ];
    } else if (/mariage|divorce|pension|garde|family|marriage|alimony|custody|inheritance/i.test(lowerQuery)) {
      authorityName = "Family Judicial Section at the Court of First Instance (Tribunal de Famille)";
      procedureSteps = [
        "1. File the petition at the registry of the Family Court at the place of residence.",
        "2. Mandatory personal attendance at reconciliation sessions appointed by the judge.",
        "3. Required documents: Marriage certificate, birth certificates of children, residence certificate, income proof."
      ];
    } else if (/entreprise|société|création|commerçant|rc|business|company|commercial|trade/i.test(lowerQuery)) {
      authorityName = "Commercial Court & Regional Investment Center (CRI / OMPIC)";
      procedureSteps = [
        "1. Obtain a Negative Certificate (Certificat Négatif) and submit incorporation documents at the CRI.",
        "2. Draft Articles of Association (Statuts) and fulfill fiscal registration requirements.",
        "3. For commercial disputes, submit the statement of claim to the Commercial Court."
      ];
    } else if (/bail|loyer|locataire|propriétaire|rent|tenant|landlord|lease|eviction/i.test(lowerQuery)) {
      authorityName = "Summary Jurisdiction Judge & Court of First Instance (Lease Law 67.12)";
      procedureSteps = [
        "1. Serve a formal notice to pay or vacate through a judicial officer giving the 15-day statutory period.",
        "2. File an application for validation of notice before the President of the Court acting as summary judge.",
        "3. Required documents: Certified lease agreement, notice formal reports, payment receipts."
      ];
    } else if (/penal|pénal|crime|vol|escroquerie|plainte|criminal|police|fraud|theft|assault/i.test(lowerQuery)) {
      authorityName = "Public Prosecution (King's Prosecutor) & Judicial Police";
      procedureSteps = [
        "1. File a written complaint supported by evidence with the King's Prosecutor at the Court of First Instance.",
        "2. Referral of complaint to the Judicial Police for investigation and hearing of parties.",
        "3. Criminal prosecution and joining as a civil party to claim damages."
      ];
    }

    let dbArticlesSection = "";
    if (docs && docs.length > 0) {
      dbArticlesSection = `📌 **Legal Texts Extracted from Database (Moroccan Legal Framework)**:\n`;
      docs.forEach((doc, idx) => {
        dbArticlesSection += `\n**[Legal Resource ${idx + 1}: ${doc.title || 'Moroccan Legislation'}]** (${doc.category || 'General'})\n${doc.content}\n`;
      });
    } else {
      dbArticlesSection = `📌 **General Legal Framework (Moroccan Law)**:\nYour matter is governed by Moroccan legislation, including the **Dahir of Obligations and Contracts (D.O.C.)** and applicable civil/criminal codes.`;
    }

    return `### ⚖️ AI Legal Analysis (Moroccan Law)

${dbArticlesSection}

📖 **Detailed Legal Analysis**:
Regarding your inquiry: "${query}"
- Moroccan legal provisions guarantee procedure and legal protection for rights and obligations.
- Written evidence and authenticated contracts are essential to substantiate claims in court.

⚖️ **Competent Jurisdiction & Step-by-Step Procedure**:
- **Competent Authority/Court**: **${authorityName}**
${procedureSteps.join('\n')}

⚠️ **Important Disclaimer**:
This analysis is automatically generated for guidance purposes under Moroccan Law and does not replace professional legal advice from a registered attorney.`;

  } else {
    // Default: French
    let authorityName = "Tribunal de Première Instance compétent";
    let procedureSteps = [
      "1. Constituer un dossier complet avec les pièces justificatives et les écrites liées au litige.",
      "2. Se présenter au greffe du Tribunal de Première Instance du lieu de résidence du défendeur ou du litige.",
      "3. Consulter un avocat inscrit au barreau pour le suivi de la procédure."
    ];

    if (/travail|licenciement|salaire|employeur|contrat|travailateur/i.test(lowerQuery)) {
      authorityName = "Inspection du Travail & Tribunal de Première Instance - Chambre Sociale";
      procedureSteps = [
        "1. Déposer une demande de conciliation préalable auprès de l'Inspecteur du travail dans les 90 jours du litige.",
        "2. En cas d'échec de la conciliation, déposer une requête introductive devant la Chambre Sociale du Tribunal.",
        "3. Pièces requises : Contrat de travail, bulletins de paie, certificat de travail, procès-verbal de conciliation."
      ];
    } else if (/mariage|divorce|pension|garde|famille|héritage/i.test(lowerQuery)) {
      authorityName = "Section du Judaïcat de Famille près le Tribunal de Première Instance";
      procedureSteps = [
        "1. Déposer la requête au greffe de la Section de Famille du Tribunal de résidence.",
        "2. Présence personnelle obligatoire aux séances de conciliation fixées par le juge rapporteur.",
        "3. Pièces requises : Acte de mariage original, actes de naissance des enfants, certificat de résidence, justificatifs de revenus."
      ];
    } else if (/entreprise|société|création|commerçant|rc|commerce/i.test(lowerQuery)) {
      authorityName = "Tribunal de Commerce & Centre Régional d'Investissement (CRI / OMPIC)";
      procedureSteps = [
        "1. Obtenir le Certificat Négatif et déposer le dossier de création via le guichet unique du CRI.",
        "2. Rédiger les Statuts et procéder aux immatriculations fiscales (IF / TP / RC).",
        "3. En cas de litige commercial, saisir le greffe du Tribunal de Commerce compétent."
      ];
    } else if (/bail|loyer|locataire|propriétaire|éviction/i.test(lowerQuery)) {
      authorityName = "Juge des Référés & Tribunal de Première Instance (Loi 67.12 sur le bail)";
      procedureSteps = [
        "1. Adresser une mise en demeure d'payer ou de déguerpir par huissier de justice (délai légal de 15 jours).",
        "2. Déposer une requête en validation du congé devant le Président du Tribunal statuant en référé.",
        "3. Pièces requises : Contrat de bail légalisé, procès-verbaux de notification, reçus de loyer."
      ];
    } else if (/penal|pénal|crime|vol|escroquerie|plainte|police|agression/i.test(lowerQuery)) {
      authorityName = "Parquet (Procureur du Roi) & Police Judiciaire";
      procedureSteps = [
        "1. Adresser une plainte écrite motivée au Procureur du Roi près le Tribunal de Première Instance.",
        "2. Transmettre la plainte aux services de la Police Judiciaire pour enquête et audition des parties.",
        "3. Se constituer partie civile pour réclamer des dommages et intérêts."
      ];
    }

    let dbArticlesSection = "";
    if (docs && docs.length > 0) {
      dbArticlesSection = `📌 **Textes et références юридиques issus de la base de données RAG** :\n`;
      docs.forEach((doc, idx) => {
        dbArticlesSection += `\n**[Ressource Juridique ${idx + 1}: ${doc.title || 'Législation Marocaine'}]** (${doc.category || 'Général'})\n${doc.content}\n`;
      });
    } else {
      dbArticlesSection = `📌 **Cadre légal général (Droit Marocain)** :\nVotre situation relève de la législation marocaine en vigueur, notamment du **Dahir des Obligations et Contrats (D.O.C.)** et des codes de procédure applicables.`;
    }

    return `### ⚖️ Analyse Juridique IA (Droit Marocain)

${dbArticlesSection}

📖 **Analyse juridique détaillée** :
Concernant votre demande : "${query}"
- La législation marocaine garantit les procédures et la protection des droits et obligations des parties.
- Les preuves écrites et contrats légalisés sont essentiels pour faire valoir vos droits devant les juridictions.

⚖️ **Démarches pratiques & Juridiction compétente** :
- **Juridiction / Autorité compétente** : **${authorityName}**
${procedureSteps.join('\n')}

⚠️ **Avertissement important** :
Cette analyse est générée automatiquement à titre d'orientation juridique sous le Droit Marocain et ne remplace en aucun cas la consultation d'un avocat inscrit au barreau.`;
  }
}

/**
 * Async generator for streaming chat.
 * ALWAYS yields objects in the shape: { choices: [{ delta: { content: string } }] }
 */
async function* createStreamingChat(messages, contextDocuments = [], language = 'fr') {
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
    const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments, language);
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
  const systemInstruction = buildSystemPrompt(contextDocuments, language);

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
  const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments, language);
  yield* streamText(fallbackText);
}

async function createChatCompletion(messages, contextDocuments = [], language = 'fr') {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const fallbackText = await generateDatabaseDrivenFallback(lastUserMessage, contextDocuments, language);
  return { message: { content: fallbackText } };
}

/**
 * Generates a structured AI legal analysis for a submitted legal request.
 */
async function analyzeLegalRequest({ title, description, category, language = 'fr' }) {
  const query = `${title} ${description}`.trim();
  const langCode = (language || 'fr').toLowerCase();

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
  return await generateDatabaseDrivenFallback(query, contextDocuments, language);
}

module.exports = {
  generateEmbedding,
  createStreamingChat,
  createChatCompletion,
  analyzeLegalRequest,
  legalFunctions,
};