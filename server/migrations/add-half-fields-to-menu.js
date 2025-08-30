// server/migrations/YYYYMMDDHHMMSS-add-half-fields-to-menu.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Menus', 'hasHalf', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('Menus', 'halfPrice', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Menus', 'hasHalf');
    await queryInterface.removeColumn('Menus', 'halfPrice');
  },
};