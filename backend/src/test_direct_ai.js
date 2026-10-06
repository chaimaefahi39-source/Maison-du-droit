require('dotenv').config();
const { analyzeLegalRequest } = require('./services/openai.service');

async function run() {
  try {
    console.log('Testing analyzeLegalRequest...');
    const result = await analyzeLegalRequest({
      title: 'Rupture abusive du contrat de travail',
      description: 'Mon employeur m\'a licencié sans préavis ni indemnités après 3 ans d\'ancienneté en tant que développeur.',
      category: 'travail'
    });
    console.log('--- RESULT CONTENT ---');
    console.log(result);
    console.log('----------------------');
  } catch (err) {
    console.error('ERROR:', err);
  }
}

run();
