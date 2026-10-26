require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/v1/auth',              require('./routes/auth'));
app.use('/api/v1/users',             require('./routes/users'));
app.use('/api/v1/karagars',          require('./routes/karagars'));
app.use('/api/v1/jobs',              require('./routes/jobs'));
app.use('/api/v1/treasury',          require('./routes/treasury'));
app.use('/api/v1/material-issuance', require('./routes/material-issuance'));
app.use('/api/v1/material-receipts', require('./routes/material-receipts'));
app.use('/api/v1/advances',          require('./routes/advances'));
app.use('/api/v1/payroll',           require('./routes/payroll'));
app.use('/api/v1/dashboard',         require('./routes/dashboard'));
app.use('/api/v1/reports',           require('./routes/reports'));

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 3000, () =>
      console.log(`GoldCraft backend running on http://localhost:${process.env.PORT || 3000}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
