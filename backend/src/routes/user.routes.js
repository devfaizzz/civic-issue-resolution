const express = require('express');
const router = express.Router();

router.get('/me', (req, res) => {
  return res.status(200).json({ user: null });
});

module.exports = router;


