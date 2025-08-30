const User = require('../models/User');
   const yup = require('yup');

   const planSchema = yup.object().shape({
     planType: yup
       .string()
       .required('Plan type is required')
       .oneOf(['free_trial', '1_month', '6_months', '1_year'], 'Invalid plan type'),
   });

   exports.selectPlan = async (req, res) => {
     const { planType } = req.body;
     try {
       await planSchema.validate({ planType });

       const user = await User.findByPk(req.user.id);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }

       if (planType === 'free_trial' && user.hasUsedFreeTrial) {
         return res.status(400).json({ message: 'Free trial already used' });
       }

       if (planType === 'free_trial') {
         const startDate = new Date();
         const endDate = new Date();
         endDate.setDate(startDate.getDate() + 10);

         user.planType = planType;
         user.planStartDate = startDate;
         user.planEndDate = endDate;
         user.hasUsedFreeTrial = true;
         await user.save();

         res.json({
           message: 'Free trial activated',
           user: {
             id: user.id,
             restaurantName: user.restaurantName,
             email: user.email,
             planType: user.planType,
             planEndDate: user.planEndDate,
             hasUsedFreeTrial: user.hasUsedFreeTrial,
           },
         });
       } else {
         // For paid plans, return plan details for frontend to initiate payment
         const planDetails = {
           '1_month': { amount: 599, durationDays: 30 },
           '6_months': { amount: 2999, durationDays: 180 },
           '1_year': { amount: 4499, durationDays: 365 },
         };
         res.json({
           message: 'Proceed to payment',
           planType,
           amount: planDetails[planType].amount,
           durationDays: planDetails[planType].durationDays,
         });
       }
     } catch (error) {
       console.error('Plan selection error:', error);
       res.status(400).json({ message: error.message || 'Invalid request' });
     }
   };