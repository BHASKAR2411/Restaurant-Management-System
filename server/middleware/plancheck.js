const User = require('../models/User');

   const planCheck = async (req, res, next) => {
     try {
       const user = await User.findByPk(req.user.id);
       if (!user) {
         return res.status(404).json({ message: 'User not found' });
       }

       if (!user.planType || (user.planEndDate && new Date(user.planEndDate) < new Date())) {
         return res.status(403).json({
           message: 'Plan expired or not selected',
           requiresPlan: true,
           hasUsedFreeTrial: user.hasUsedFreeTrial,
         });
       }

       next();
     } catch (error) {
       console.error('Plan check error:', error);
       res.status(500).json({ message: 'Server error' });
     }
   };

   module.exports = planCheck;