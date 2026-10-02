const { createStreamingChat } = require('../src/services/openai.service');

async function testFallbackStream() {
  console.log('=== Test 2: Fallback Dynamic Database RAG Stream ===');
  // Temporarily force key error to test fallback
  process.env.GEMINI_API_KEY = 'invalid_key_for_testing';
  
  const messages = [{ role: 'user', content: 'ما هي عقوبة السرقة والتزوير في القانون الجنائي المغربي؟' }];
  
  try {
    const stream = createStreamingChat(messages, []);
    let fullOutput = '';
    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content || '';
      fullOutput += text;
      process.stdout.write(text);
    }
    console.log('\n--- FALLBACK STREAM END ---\n');
  } catch (err) {
    console.error('Test 2 Unexpected Failure:', err);
  }
}

testFallbackStream();
