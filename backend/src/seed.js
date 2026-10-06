const db = require('./models');
const LegalResource = db.LegalResource;
const { LEGAL_RESOURCES, cleanAndSeedResources } = require('./cleanAndSeedResources');

async function seedResources() {
  return cleanAndSeedResources();
}

if (require.main === module) {
  db.sequelize.sync({ alter: true }).then(() => {
    seedResources().then(() => process.exit(0));
  });
}

module.exports = { seedResources, LEGAL_RESOURCES };