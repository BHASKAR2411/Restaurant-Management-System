const express = require('express');
const { createReview, getReviews } = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const yup = require('yup');

const router = express.Router();

const reviewSchema = yup.object().shape({
  tableNo: yup.number().positive('Table number must be positive').required('Table number is required'),
  stars: yup.number().min(1).max(5).required('Stars are required'),
  comment: yup.string().nullable(),
  restaurantId: yup.number().required('Restaurant ID is required'),
});

router.post('/', validate(reviewSchema), createReview); // Public for clients
router.get('/', auth, getReviews);

module.exports = router;