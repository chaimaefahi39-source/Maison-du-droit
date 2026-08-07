const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Note: The 'embedding' column (VECTOR type) is added via raw SQL
// in the model index after sync, since Sequelize has no native vector type.
const LegalResource = sequelize.define('LegalResource', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'legal_resources',
});

module.exports = LegalResource;
