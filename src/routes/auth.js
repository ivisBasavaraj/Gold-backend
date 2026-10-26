const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = sign(user._id);
    const refreshToken = signRefresh(user._id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        employeeCode: user.employeeCode,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const accessToken = sign(decoded.id);
    const newRefresh = signRefresh(decoded.id);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// GET /auth/me
router.get('/me', auth, (req, res) => {
  const u = req.user;
  res.json({
    _id: u._id,
    name: u.name,
    username: u.username,
    role: u.role,
    employeeCode: u.employeeCode,
    avatarUrl: u.avatarUrl,
  });
});

// POST /auth/logout
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out' });
});

// POST /auth/seed — create demo users if none exist
router.post('/seed', async (req, res) => {
  try {
    await User.deleteMany({});
    const users = [
      { name: 'Workshop Manager', username: 'manager', password: 'demo1234', role: 'manager', employeeCode: 'MGR-001' },
      { name: 'Admin User',       username: 'admin',   password: 'demo1234', role: 'admin',   employeeCode: 'ADM-001' },
      { name: 'Raju Kumar',       username: 'karagar1',password: 'demo1234', role: 'karagar', employeeCode: 'GC-001'  },
      { name: 'Suresh Patil',     username: 'karagar2',password: 'demo1234', role: 'karagar', employeeCode: 'GC-002'  },
    ];
    for (const u of users) {
      await new User(u).save();
    }
    res.json({ success: true, message: 'Demo users seeded', users: users.map(u => u.username) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
