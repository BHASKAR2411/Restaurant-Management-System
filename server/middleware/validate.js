const validate = (schema) => (req, res, next) => {
  try {
    schema.validateSync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errors = error.inner.map(err => ({
      field: err.path,
      message: err.message,
    }));
    res.status(400).json({ message: 'Validation failed', errors });
  }
};

module.exports = validate;