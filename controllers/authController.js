const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const register = async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';

  if (!normalizedUsername || normalizedUsername.length < 3 || !password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Username must be at least 3 characters and password must be at least 6 characters.'
    });
  }

  const existingUser = await User.findOne({ username: normalizedUsername });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Username already in use' });
  }

  const user = await User.create({ username: normalizedUsername, password });
  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins,
        currentLevel: user.currentLevel,
        highScore: user.highScore
      }
    }
  });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';

  if (!normalizedUsername || !password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.'
    });
  }

  const user = await User.findOne({ username: normalizedUsername }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = signToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins,
        currentLevel: user.currentLevel,
        highScore: user.highScore
      }
    }
  });
};

module.exports = { register, login };
