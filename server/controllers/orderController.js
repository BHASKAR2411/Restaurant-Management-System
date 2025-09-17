const { Op } = require('sequelize');
const Order = require('../models/Order');
const User = require('../models/User');
const Menu = require('../models/Menu');
const ExcelJS = require('exceljs');

exports.createOrder = async (req, res) => {
  const { tableNo, items, total, restaurantId } = req.body;
  try {
    const resolvedRestaurantId = restaurantId || items[0]?.restaurantId || req.query.restaurantId;
    if (!resolvedRestaurantId || isNaN(resolvedRestaurantId) || Number(resolvedRestaurantId) <= 0) {
      return res.status(400).json({ message: 'Restaurant ID is required and must be a valid number' });
    }
    const user = await User.findByPk(Number(resolvedRestaurantId));
    if (!user) {
      return res.status(400).json({ message: 'Invalid restaurant ID: Restaurant not found' });
    }
    if (user.isSubmitDisabled) {
      return res.status(403).json({ message: 'Order submission is currently disabled' });
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

exports.createAdminOrder = async (req, res) => {
  const { tableNo, items, total, restaurantId } = req.body;
  try {
    const resolvedRestaurantId = restaurantId || items[0]?.restaurantId || req.query.restaurantId;
    if (!resolvedRestaurantId || isNaN(resolvedRestaurantId) || Number(resolvedRestaurantId) <= 0) {
      return res.status(400).json({ message: 'Restaurant ID is required and must be a valid number' });
    }
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
    console.error('Error creating admin order:', error);
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
    console.log('Emitting orderUpdated for order:', order.id);
    global.io.emit('orderUpdated', order);
    res.json(order);
  } catch (error) {
    console.error('Error moving order to recurring:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.completeOrder = async (req, res) => {
  const { tableNo, discount, message, serviceCharge, gstRate, gstType } = req.body;
  try {
    const parsedTableNo = parseInt(tableNo);
    if (isNaN(parsedTableNo)) {
      return res.status(400).json({ message: 'Invalid table number' });
    }
    const orders = await Order.findAll({
      where: { tableNo: parsedTableNo, restaurantId: req.user.id, status: 'recurring' },
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
    const originalSubtotal = groupedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const rate = parseFloat(gstRate) / 100;
    let discountAmount = 0;
    let taxableAmount = 0;
    let gstAmount = 0;
    const serviceChargeAmount = parseFloat(serviceCharge) || 0;

    if (gstType === 'inclusive') {
      const baseSubtotal = originalSubtotal / (1 + rate);
      discountAmount = discount ? (baseSubtotal * parseFloat(discount)) / 100 : 0;
      taxableAmount = baseSubtotal - discountAmount;
      gstAmount = taxableAmount * rate;
    } else {
      discountAmount = discount ? (originalSubtotal * parseFloat(discount)) / 100 : 0;
      taxableAmount = originalSubtotal - discountAmount;
      gstAmount = taxableAmount * rate;
    }

    const finalTotal = taxableAmount + gstAmount + serviceChargeAmount;

    const receiptDetails = {
      items: groupedItems,
      originalSubtotal,
      discountPercent: discount ? parseFloat(discount) : 0,
      discountAmount,
      serviceCharge: serviceChargeAmount,
      gstRate: parseFloat(gstRate),
      gstType,
      gstAmount,
      taxableAmount,
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
      { where: { tableNo: parsedTableNo, restaurantId: req.user.id, status: 'recurring' } }
    );

    const updatedOrders = orders.map((o) => ({
      ...o.dataValues,
      status: 'past',
      receiptDetails,
      serviceCharge: serviceChargeAmount,
      gstRate: parseFloat(gstRate),
      gstType,
      discount,
      message,
      tableNo: parseInt(o.tableNo),
    }));

    console.log('Emitting ordersCompleted for tableNo:', parsedTableNo, 'orders:', updatedOrders.length);
    global.io.emit('ordersCompleted', { restaurantId: req.user.id, tableNo: parsedTableNo, orders: updatedOrders });

    res.json({ message: 'Orders completed and receipt saved', receiptDetails });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    console.log('Emitting orderDeleted for order:', id);
    global.io.emit('orderDeleted', { id, restaurantId: req.user.id });
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
    const { orderId } = req.params;
    const order = await Order.findOne({
      where: { id: orderId, restaurantId: req.user.id, status: 'past' },
    });
    if (!order || !order.receiptDetails) {
      return res.status(404).json({ message: 'No receipt found for this order' });
    }
    console.log('Fetching receipt for orderId:', orderId);
    res.json({ ...order.receiptDetails, tableNo: order.tableNo, completionDate: order.updatedAt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleSubmitDisabled = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isSubmitDisabled = !user.isSubmitDisabled;
    await user.save();
    
    console.log('Emitting submitDisabledUpdate for restaurantId:', req.user.id);
    global.io.emit('submitDisabledUpdate', {
      restaurantId: req.user.id,
      isSubmitDisabled: user.isSubmitDisabled,
    });
    
    res.json({ isSubmitDisabled: user.isSubmitDisabled });
  } catch (error) {
    console.error('Error toggling submit disabled state:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSubmitDisabledStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.query.restaurantId);
    if (!user) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.json({ isSubmitDisabled: user.isSubmitDisabled });
  } catch (error) {
    console.error('Error fetching submit disabled status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.exportOrders = async (req, res) => {
  const { type, year, months, from, to } = req.query;
  console.log('Export orders requested with params:', { type, year, months, from, to });
  try {
    let where = { restaurantId: req.user.id, status: 'past' };
    let dateFilter = {};

    if (type === 'year') {
      if (!year) return res.status(400).json({ message: 'Year is required' });
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      dateFilter = { [Op.between]: [start, end] };
    } else if (type === 'month') {
      if (!year || !months) return res.status(400).json({ message: 'Year and months are required' });
      const monthArr = months.split(',').map(Number);
      if (monthArr.length === 0 || monthArr.some(isNaN)) {
        return res.status(400).json({ message: 'Invalid months provided' });
      }
      const orConditions = monthArr.map((m) => {
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 0, 23, 59, 59);
        return { createdAt: { [Op.between]: [start, end] } };
      });
      where[Op.or] = orConditions;
    } else if (type === 'custom') {
      if (!from || !to) return res.status(400).json({ message: 'From and to dates are required' });
      const start = new Date(from);
      const end = new Date(`${to}T23:59:59`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      dateFilter = { [Op.between]: [start, end] };
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const orders = await Order.findAll({
      where,
      order: [['updatedAt', 'DESC']],
    });

    console.log('Found orders for export:', orders.length);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Past Orders');

    sheet.columns = [
      { header: 'Completion Date', key: 'updatedAt', width: 20 },
      { header: 'Table No', key: 'tableNo', width: 10 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 10 },
      { header: 'Amount', key: 'amount', width: 10 },
      { header: 'Subtotal', key: 'subtotal', width: 10 },
      { header: 'Discount %', key: 'discountPercent', width: 10 },
      { header: 'Discount Amount', key: 'discountAmount', width: 15 },
      { header: 'Service Charge', key: 'serviceCharge', width: 15 },
      { header: 'Taxable Amount', key: 'taxableAmount', width: 15 },
      { header: 'GST Rate', key: 'gstRate', width: 10 },
      { header: 'GST Type', key: 'gstType', width: 10 },
      { header: 'GST Amount', key: 'gstAmount', width: 10 },
      { header: 'Grand Total', key: 'total', width: 15 },
      { header: 'Message', key: 'message', width: 30 },
    ];

    if (orders.length === 0) {
      console.log('No orders found, returning empty Excel file with headers');
      // Add headers only
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=past_orders.xlsx');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    const groups = {};
    orders.forEach((order) => {
      const key = `${order.updatedAt.toISOString()}_${order.tableNo}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });

    for (const key in groups) {
      const batch = groups[key];
      const rd = batch[0].receiptDetails;
      if (!rd) {
        console.warn(`Skipping batch ${key} due to missing receiptDetails`);
        continue;
      }

      rd.items.forEach((item) => {
        sheet.addRow({
          updatedAt: batch[0].updatedAt,
          tableNo: batch[0].tableNo,
          item: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: item.price * item.quantity,
          subtotal: rd.originalSubtotal,
          discountPercent: rd.discountPercent,
          discountAmount: rd.discountAmount,
          serviceCharge: rd.serviceCharge,
          taxableAmount: rd.taxableAmount,
          gstRate: rd.gstRate,
          gstType: rd.gstType,
          gstAmount: rd.gstAmount,
          total: rd.total,
          message: rd.message,
        });
      });
      sheet.addRow({});
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=past_orders.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = exports;