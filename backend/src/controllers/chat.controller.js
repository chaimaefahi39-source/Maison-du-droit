const aiController = require('./ai.controller');

module.exports = {
  ...aiController,
  deleteMessage: aiController.deleteMessage,
};
