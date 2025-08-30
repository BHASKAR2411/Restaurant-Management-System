const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tableNo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0, // Changed from min: 1 to allow counter delivery
    },
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'live',
    validate: {
      isIn: [['live', 'recurring', 'past']],
    },
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  receiptDetails: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  serviceCharge: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  gstRate: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  gstType: {
    type: DataTypes.ENUM('inclusive', 'exclusive'),
    allowNull: true,
  },
  discount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

Order.belongsTo(User, { foreignKey: 'restaurantId' });

module.exports = Order;