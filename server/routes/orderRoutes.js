const express = require('express');
const {
  createOrder,
  getLiveOrders,
  getRecurringOrders,
  getPastOrders,
  moveToRecurring,
  completeOrder,
  getOrderStats,
  deleteOrder,
  getRestaurantDetails,
  reprintReceipt,
  toggleSubmitDisabled,
  getSubmitDisabledStatus,
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const yup = require('yup');

const router = express.Router();

const orderSchema = yup.object().shape({
  tableNo: yup.number().positive('Table number must be positive').required('Table number is required'),
  items: yup.array().of(
    yup.object().shape({
      id: yup.number().required(),
      name: yup.string().required(),
      price: yup.number().positive().required(),
      quantity: yup.number().positive().required(),
      isVeg: yup.boolean().required(),
      portion: yup.string().oneOf(['half', 'full']).required('Portion must be half or full'),
    })
  ).min(1, 'At least one item is required'),
  total: yup.number().positive('Total must be positive').required('Total is required'),
});

const completeOrderSchema = yup.object().shape({
  tableNo: yup.number().positive().required(),
  discount: yup.number().min(0).max(100).nullable(),
  message: yup.string().nullable(),
  serviceCharge: yup.number().min(0).nullable(),
  gstRate: yup.number().oneOf([0, 5, 12, 18]).nullable(),
  gstType: yup.string().oneOf(['inclusive', 'exclusive']).nullable(),
});

router.post('/', validate(orderSchema), createOrder);
router.get('/live', auth, getLiveOrders);
router.get('/recurring', auth, getRecurringOrders);
router.get('/past', auth, getPastOrders);
router.put('/:id/recurring', auth, moveToRecurring);
router.post('/complete', auth, validate(completeOrderSchema), completeOrder);
router.get('/stats', auth, getOrderStats);
router.delete('/:id', auth, deleteOrder);
router.get('/restaurant/details', auth, getRestaurantDetails);
router.get('/reprint/:tableNo', auth, reprintReceipt);
router.put('/toggle-submit-disabled', auth, toggleSubmitDisabled);
router.get('/submit-disabled', getSubmitDisabledStatus);

module.exports = router;