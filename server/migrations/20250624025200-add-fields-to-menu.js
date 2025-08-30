module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tableNo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 0, // Changed to allow counter delivery
        },
      },
      total: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      restaurantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'live',
      },
      receiptDetails: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      serviceCharge: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      gstRate: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      gstType: {
        type: Sequelize.ENUM('inclusive', 'exclusive'),
        allowNull: true,
      },
      discount: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      message: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Orders');
  },
};