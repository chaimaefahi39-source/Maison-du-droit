const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LegalRequest = sequelize.define('LegalRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
    validate: {
      isIn: [['travail', 'logement', 'famille', 'commerce', 'penal', 'administratif', 'general']],
    },
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  aiResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'legal_requests',
});

module.exports = LegalRequest;
