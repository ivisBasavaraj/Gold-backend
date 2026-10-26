require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const karagarsRoutes = require('./routes/karagars');
const jobsRoutes = require('./routes/jobs');
const treasuryRoutes = require('./routes/treasury');
const issuanceRoutes = require('./routes/material-issuance');
const receiptsRoutes = require('./routes/material-receipts');
const advancesRoutes = require('./routes/advances');
const payrollRoutes = require('./routes/payroll');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/karagars', karagarsRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/treasury', treasuryRoutes);
app.use('/api/v1/material-issuance', issuanceRoutes);
app.use('/api/v1/material-receipts', receiptsRoutes);
app.use('/api/v1/advances', advancesRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportsRoutes);

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () =>
      console.log(`GoldCraft backend running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
