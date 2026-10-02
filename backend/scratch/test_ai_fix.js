const { createStreamingChat } = require('../src/services/openai.service');

async function testSuccessStream() {
  console.log('=== Test 1: Real Gemini LLM Streaming ===');
  const messages = [{ role: 'user', content: 'كيف يتم عقد الكراء في القانون المغربي؟' }];
  
  try {
    const stream = createStreamingChat(messages, []);
    let fullOutput = '';
    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content || '';
      fullOutput += text;
      process.stdout.write(text);
    }
    console.log('\n--- SUCCESS STREAM END ---\n');
  } catch (err) {
    console.error('Test 1 Unexpected Failure:', err);
  }
}

testSuccessStream();
