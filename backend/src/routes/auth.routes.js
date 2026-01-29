const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !phone || !password) return res.status(400).json({ message: 'Missing fields' });
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return res.status(409).json({ message: 'User already exists' });
    const user = await User.create({ name, email, phone, password, role: role === 'admin' ? 'admin' : 'citizen' });
    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());
    res.status(201).json({ token, refreshToken, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());
    res.json({ token, refreshToken, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) return res.status(401).json({ message: 'Invalid refresh token' });
  const token = generateToken(decoded.userId, 'citizen');
  res.json({ token });
});

module.exports = router;


