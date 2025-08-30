const express = require('express');
   const { selectPlan } = require('../controllers/plancontroller');
   const auth = require('../middleware/auth');
   const validate = require('../middleware/validate');
   const yup = require('yup');

   const router = express.Router();

   const planSchema = yup.object().shape({
     planType: yup
       .string()
       .required('Plan type is required')
       .oneOf(['free_trial', '1_month', '6_months', '1_year'], 'Invalid plan type'),
   });

   router.post('/', auth, validate(planSchema), selectPlan);

   module.exports = router;