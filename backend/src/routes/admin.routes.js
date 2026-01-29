const express = require('express');
const router = express.Router();

router.get('/overview', (req, res) => {
  return res.status(200).json({ summary: {} });
});

module.exports = router;


