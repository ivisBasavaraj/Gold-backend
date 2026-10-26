const router = require('express').Router();
const Karagar = require('../models/Karagar');
const { auth, requireRole } = require('../middleware/auth');

// GET /karagars
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.meltingGroup) filter.meltingGroup = req.query.meltingGroup;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Karagar.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Karagar.countDocuments(filter),
    ]);
    res.json({ data: { items, total, page, limit } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /karagars/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const k = await Karagar.findById(req.params.id);
    if (!k) return res.status(404).json({ message: 'Karagar not found' });
    res.json({ data: k });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /karagars
router.post('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, employeeCode, meltingGroup, specialization, phone, avatarUrl } = req.body;
    if (!name || !employeeCode || !meltingGroup || !specialization)
      return res.status(400).json({ message: 'name, employeeCode, meltingGroup, specialization required' });

    const exists = await Karagar.findOne({ employeeCode });
    if (exists) return res.status(409).json({ message: 'Employee code already exists' });

    const karagar = await Karagar.create({ name, employeeCode, meltingGroup, specialization, phone, avatarUrl });
    res.status(201).json({ data: karagar });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /karagars/:id
router.patch('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const allowed = ['name', 'meltingGroup', 'specialization', 'phone', 'avatarUrl', 'isActive'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const k = await Karagar.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!k) return res.status(404).json({ message: 'Karagar not found' });
    res.json({ data: k });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /karagars/:id — soft delete (deactivate)
router.delete('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const k = await Karagar.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!k) return res.status(404).json({ message: 'Karagar not found' });
    res.json({ data: k, message: 'Karagar deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
