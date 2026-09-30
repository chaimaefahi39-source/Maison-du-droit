require('dotenv').config();

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
 * دالة البث التدفقي الصريحة
 */
async function* createStreamingChat(messages, contextDocuments = []) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  if (!GEMINI_API_KEY) {
    yield {
      choices: [{ delta: { content: "يرجى إضافة GEMINI_API_KEY في ملف .env في الباك إند." }, finish_reason: 'stop' }]
    };
    return;
  }

  try {
    const systemInstruction = buildSystemPrompt(contextDocuments);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: lastUserMessage }] }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'خطأ في استجابة Gemini');
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم الحصول على رد.";

    // تقسيم الرد لمحاكاة تدفق سريع وسلس
    const words = reply.split(' ');
    for (let i = 0; i < words.length; i++) {
      const piece = (i === 0 ? '' : ' ') + words[i];
      yield {
        choices: [{ delta: { content: piece }, finish_reason: null }]
      };
      await new Promise(r => setTimeout(r, 20));
    }

    yield {
      choices: [{ delta: {}, finish_reason: 'stop' }]
    };

  } catch (err) {
    console.error('Gemini Fetch Error:', err.message);
    yield {
      choices: [{ delta: { content: `\nحدث خطأ في معالجة الطلب: ${err.message}` }, finish_reason: 'stop' }]
    };
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