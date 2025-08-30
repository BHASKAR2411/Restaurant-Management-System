// server/models/Menu.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Menu = sequelize.define('Menu', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isVeg: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: {
        args: 0,
        msg: 'Price must be positive',
      },
    },
  },
  hasHalf: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  halfPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      custom(value) {
        if (this.hasHalf && (value === null || value === undefined || isNaN(value) || value <= 0)) {
          throw new Error('Half price must be positive when half option is enabled');
        }
        if (!this.hasHalf && value !== null) {
          throw new Error('Half price must be null when half option is disabled');
        }
      },
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

Menu.belongsTo(User, { foreignKey: 'userId' });

module.exports = Menu; 