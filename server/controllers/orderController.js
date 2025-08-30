const { Op } = require('sequelize');
const Order = require('../models/Order');
const User = require('../models/User');
const Menu = require('../models/Menu');

exports.createOrder = async (req, res) => {
  const { tableNo, items, total, restaurantId } = req.body;
  try {
    const resolvedRestaurantId = restaurantId || items[0]?.restaurantId || req.query.restaurantId;
    if (!resolvedRestaurantId || isNaN(resolvedRestaurantId) || Number(resolvedRestaurantId) <= 0) {
      return res.status(400).json({ message: 'Restaurant ID is required and must be a valid number' });
    }
    // Validate restaurantId exists in Users table
    const user = await User.findByPk(Number(resolvedRestaurantId));
    if (!user) {
      return res.status(400).json({ message: 'Invalid restaurant ID: Restaurant not found' });
    }
    if (!tableNo || !Number.isInteger(tableNo) || tableNo < 0) {
      return res.status(400).json({ message: 'Invalid table number' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items must be a non-empty array' });
    }
    const errors = [];
    const enrichedItems = [];
    for (const item of items) {
      if (!item.id || !item.name || typeof item.isVeg !== 'boolean' || !item.price || !item.quantity || !item.portion) {
        errors.push({
          field: `items[${items.indexOf(item)}].${!item.id ? 'id' : !item.name ? 'name' : !item.price ? 'price' : !item.quantity ? 'quantity' : !item.portion ? 'portion' : 'isVeg'}`,
          message: `items[${items.indexOf(item)}].${!item.id ? 'id' : !item.name ? 'name' : !item.price ? 'price' : !item.quantity ? 'quantity' : !item.portion ? 'portion' : 'isVeg'} is a required field`,
        });
      } else if (!['half', 'full'].includes(item.portion)) {
        errors.push({
          field: `items[${items.indexOf(item)}].portion`,
          message: `Portion must be 'half' or 'full'`,
        });
      } else {
        const menuItem = await Menu.findByPk(item.id);
        if (menuItem) {
          const expectedPrice = item.portion === 'half' && menuItem.hasHalf ? menuItem.halfPrice : menuItem.price;
          if (Math.abs(item.price - expectedPrice) > 0.01) {
            errors.push({
              field: `items[${items.indexOf(item)}].price`,
              message: `Price for ${item.name} (${item.portion}) does not match menu price (expected ₹${expectedPrice.toFixed(2)})`,
            });
          } else {
            enrichedItems.push({
              ...item,
              category: menuItem.category,
              portion: item.portion,
            });
          }
        } else {
          errors.push({
            field: `items[${items.indexOf(item)}].id`,
            message: `Menu item with ID ${item.id} not found`,
          });
        }
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    if (!total || typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }
    const calculatedTotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (Math.abs(total - calculatedTotal) > 0.01) {
      return res.status(400).json({ message: `Total does not match calculated item total (expected ₹${calculatedTotal.toFixed(2)})` });
    }
    const order = await Order.create({
      tableNo,
      items: enrichedItems,
      total,
      restaurantId: Number(resolvedRestaurantId),
      status: 'live',
    });
    console.log('Emitting newOrder globally, Order ID:', order.id, 'restaurantId:', resolvedRestaurantId);
    global.io.emit('newOrder', order);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ message: 'Invalid restaurant ID: Restaurant not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getLiveOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { restaurantId: req.user.id, status: 'live' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching live orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRecurringOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { restaurantId: req.user.id, status: 'recurring' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching recurring orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPastOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { restaurantId: req.user.id, status: 'past' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching past orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.moveToRecurring = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findOne({ where: { id, restaurantId: req.user.id } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.status = 'recurring';
    await order.save();
    res.json(order);
  } catch (error) {
    console.error('Error moving order to recurring:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.completeOrder = async (req, res) => {
  const { tableNo, discount, message, serviceCharge, gstRate, gstType } = req.body;
  try {
    const orders = await Order.findAll({
      where: { tableNo, restaurantId: req.user.id, status: 'recurring' },
    });
    if (!orders.length) {
      return res.status(404).json({ message: 'No recurring orders found for this table' });
    }
    let mergedItems = [];
    orders.forEach(order => {
      mergedItems = [...mergedItems, ...order.items];
    });
    const groupedItems = mergedItems.reduce((acc, item) => {
      const existingItem = acc.find(i => i.name === item.name && i.price === item.price && i.portion === item.portion);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);
    let subtotal = groupedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discountAmount = discount ? (subtotal * discount) / 100 : 0;
    let serviceChargeAmount = parseFloat(serviceCharge) || 0;
    let gstAmount = 0;
    if (gstType === 'inclusive') {
      subtotal = subtotal / (1 + parseFloat(gstRate) / 100);
      discountAmount = discount ? (subtotal * discount) / 100 : 0;
      gstAmount = (subtotal - discountAmount) * (parseFloat(gstRate) / 100);
    } else {
      subtotal = subtotal - discountAmount;
      gstAmount = subtotal * (parseFloat(gstRate) / 100);
    }
    const finalTotal = subtotal - discountAmount + gstAmount + serviceChargeAmount;
    const receiptDetails = {
      items: groupedItems,
      subtotal,
      discount: discountAmount,
      serviceCharge: serviceChargeAmount,
      gstRate: parseFloat(gstRate),
      gstType,
      gstAmount,
      total: finalTotal,
      message,
    };
    await Order.update(
      {
        status: 'past',
        receiptDetails,
        serviceCharge: serviceChargeAmount,
        gstRate: parseFloat(gstRate),
        gstType,
        discount,
        message,
      },
      { where: { tableNo, restaurantId: req.user.id, status: 'recurring' } }
    );
    res.json({ message: 'Orders completed and receipt saved', receiptDetails });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const dailyOrders = await Order.count({
      where: {
        restaurantId: req.user.id,
        createdAt: { [Op.gte]: today },
      },
    });
    const monthlyOrders = await Order.count({
      where: {
        restaurantId: req.user.id,
        createdAt: { [Op.gte]: monthStart },
      },
    });
    res.json({ dailyOrders, monthlyOrders });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await Order.findOne({ where: { id, restaurantId: req.user.id } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    await order.destroy();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRestaurantDetails = async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      name: user.restaurantName || 'Unnamed Restaurant',
      fssai: user.fssaiNumber || 'N/A',
      gst: user.gstNumber || 'N/A',
      phoneNumber: user.phoneNumber || 'N/A',
      address: user.address || 'N/A',
      profilePicture: user.profilePicture || '[Restaurant Profile Picture Placeholder]',
    });
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reprintReceipt = async (req, res) => {
  try {
    const { tableNo } = req.params;
    const orders = await Order.findAll({
      where: { tableNo, restaurantId: req.user.id, status: 'past' },
    });
    if (!orders.length || !orders[0].receiptDetails) {
      return res.status(404).json({ message: 'No receipt found for this table' });
    }
    res.json(orders[0].receiptDetails);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;