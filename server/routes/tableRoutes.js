const express = require('express');
const { generateQR, getTables, deleteTable } = require('../controllers/tableController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const yup = require('yup');

const router = express.Router();

const tableSchema = yup.object().shape({
  tableNo: yup.number().positive('Table number must be positive').required('Table number is required'),
});

router.post('/generate-qr', auth, validate(tableSchema), generateQR);
router.get('/', auth, getTables);
router.delete('/:id', auth, deleteTable); // New route for deletion

module.exports = router;