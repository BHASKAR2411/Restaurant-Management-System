const { DataTypes } = require('sequelize');
   const sequelize = require('../config/db');

   const User = sequelize.define('User', {
     id: {
       type: DataTypes.INTEGER,
       autoIncrement: true,
       primaryKey: true,
     },
     restaurantName: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     ownerName: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     email: {
       type: DataTypes.STRING,
       allowNull: false,
       unique: true,
       validate: {
         isEmail: true,
       },
     },
     password: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     profilePicture: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     upiId: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     googleReviewLink: {
       type: DataTypes.TEXT,
       allowNull: true,
     },
     gstNumber: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     fssaiNumber: {
       type: DataTypes.STRING,
       allowNull: true,
     },
     phoneNumber: {
       type: DataTypes.STRING,
       allowNull: true,
       validate: {
         is: /^[0-9+\-\s]{10,15}$/,
       },
     },
     address: {
       type: DataTypes.TEXT,
       allowNull: true,
     },
     isVerified: {
       type: DataTypes.BOOLEAN,
       allowNull: false,
       defaultValue: false,
     },
     planType: {
       type: DataTypes.STRING,
       allowNull: true, // Null until a plan is selected
       validate: {
         isIn: [['free_trial', '1_month', '6_months', '1_year']],
       },
     },
     planStartDate: {
       type: DataTypes.DATE,
       allowNull: true,
     },
     planEndDate: {
       type: DataTypes.DATE,
       allowNull: true,
     },
     hasUsedFreeTrial: {
       type: DataTypes.BOOLEAN,
       allowNull: false,
       defaultValue: false,
     },
   }, {
     timestamps: true,
   });

   module.exports = User;