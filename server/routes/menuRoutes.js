// server/routes/menuRoutes.js
const express = require('express');
const { createMenuItem, getMenuItems, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const yup = require('yup');

const router = express.Router();

const menuSchema = yup.object().shape({
  category: yup.string().required('Category is required'),
  name: yup.string().required('Name is required'),
  isVeg: yup.boolean().required('Veg/non-veg status is required'),
  price: yup.number().positive('Price must be positive').required('Price is required'),
  hasHalf: yup.boolean().optional().default(false),
  halfPrice: yup.number().when('hasHalf', {
    is: true,
    then: (schema) => schema.positive('Half price must be positive').required('Half price is required when half option is enabled'),
    otherwise: (schema) => schema.nullable(),
  }),
  isEnabled: yup.boolean().optional(),
});

router.post('/', auth, validate(menuSchema), createMenuItem);
router.get('/', getMenuItems);
router.put('/:id', auth, validate(menuSchema), updateMenuItem);
router.delete('/:id', auth, deleteMenuItem);
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const menuItem = await require('../models/Menu').findByPk(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    await menuItem.update({ isEnabled: !menuItem.isEnabled });
    res.json(menuItem);
  } catch (error) {
    console.error('Error toggling menu item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;