const { validationResult } = require('express-validator');

const validateIssue = (req, res, next) => {
  // Placeholder: add express-validator rules elsewhere if needed
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

module.exports = { validateIssue };


