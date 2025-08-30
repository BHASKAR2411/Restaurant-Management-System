const Review = require('../models/Review');

exports.createReview = async (req, res) => {
  const { tableNo, stars, comment, restaurantId } = req.body;
  try {
    const review = await Review.create({
      tableNo,
      stars,
      comment,
      userId: restaurantId,
    });
    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({ where: { userId: req.user.id } });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};