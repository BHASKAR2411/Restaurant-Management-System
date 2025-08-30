// server/controllers/menuController.js
const Menu = require('../models/Menu');

exports.createMenuItem = async (req, res) => {
  try {
    const { category, name, isVeg, price, hasHalf, halfPrice, isEnabled } = req.body;
    const menuItem = await Menu.create({
      category,
      name,
      isVeg,
      price: parseFloat(price),
      hasHalf: hasHalf || false,
      halfPrice: hasHalf ? parseFloat(halfPrice) : null,
      userId: req.user.id,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    });
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }
    const menuItems = await Menu.findAll({ where: { userId: restaurantId } });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await Menu.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    if (menuItem.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { category, name, isVeg, price, hasHalf, halfPrice, isEnabled } = req.body;
    await menuItem.update({
      category,
      name,
      isVeg,
      price: parseFloat(price),
      hasHalf: hasHalf || false,
      halfPrice: hasHalf ? parseFloat(halfPrice) : null,
      isEnabled: isEnabled !== undefined ? isEnabled : menuItem.isEnabled,
    });
    res.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(400).json({ error: 'Validation error', details: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await Menu.findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    if (menuItem.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await menuItem.destroy();
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Server error' });
  }
};