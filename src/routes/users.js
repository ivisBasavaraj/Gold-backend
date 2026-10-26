const router = require('express').Router();
const User = require('../models/User');
const Karagar = require('../models/Karagar');
const { auth, requireRole } = require('../middleware/auth');

// GET /users — list all users (admin only)
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ data: { items: users, total: users.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /users — create manager or karagar (admin only)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, password, role, employeeCode, karagarId } = req.body;

    if (!name || !username || !password || !role)
      return res.status(400).json({ message: 'name, username, password, role required' });

    if (!['manager', 'karagar'].includes(role))
      return res.status(400).json({ message: 'role must be manager or karagar' });

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Username already taken' });

    // If karagar role, optionally link to a Karagar document
    let linkedKaragarId = null;
    if (role === 'karagar' && karagarId) {
      const karagar = await Karagar.findById(karagarId);
      if (!karagar) return res.status(404).json({ message: 'Karagar not found' });
      linkedKaragarId = karagar._id;
    }

    const user = await new User({
      name,
      username,
      password,
      role,
      employeeCode,
      karagarId: linkedKaragarId,
    }).save();

    const out = user.toObject();
    delete out.password;
    res.status(201).json({ data: out });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /users/:id/password — reset any user's password (admin only)
router.patch('/:id/password', auth, requireRole('admin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password; // pre-save hook hashes it
    await user.save();

    res.json({ message: `Password updated for ${user.username}` });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /users/:id — delete user (admin only, cannot delete self)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot delete your own account' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
