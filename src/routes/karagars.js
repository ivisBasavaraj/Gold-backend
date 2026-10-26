const router = require('express').Router();
const Karagar = require('../models/Karagar');
const { auth } = require('../middleware/auth');

// GET /karagars
router.get('/', auth, async (req, res) => {
  try {
    const karagars = await Karagar.find().sort({ name: 1 });
    res.json({ data: { items: karagars, total: karagars.length } });
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
router.post('/', auth, async (req, res) => {
  try {
    const karagar = await Karagar.create(req.body);
    res.status(201).json({ data: karagar });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /karagars/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const k = await Karagar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!k) return res.status(404).json({ message: 'Karagar not found' });
    res.json({ data: k });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
