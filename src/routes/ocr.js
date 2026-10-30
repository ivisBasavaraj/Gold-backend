const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const { auth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const OCR_URL = process.env.OCR_SERVICE_URL || 'http://localhost:8001';

// POST /ocr/read-scale
// Accepts multipart/form-data with field "image"
// Proxies to Python OCR service and returns { reading, valueGrams, confidence }
router.post('/read-scale', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'scale.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
    });

    const response = await axios.post(`${OCR_URL}/read-scale`, form, {
      headers: form.getHeaders(),
      timeout: 15000,
    });

    res.json({ data: response.data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({ message: err.response.data?.detail || 'OCR failed' });
    }
    res.status(503).json({ message: 'OCR service unavailable' });
  }
});

// GET /ocr/health
router.get('/health', async (_req, res) => {
  try {
    const r = await axios.get(`${OCR_URL}/health`, { timeout: 3000 });
    res.json({ data: r.data });
  } catch {
    res.status(503).json({ message: 'OCR service unavailable' });
  }
});

module.exports = router;
