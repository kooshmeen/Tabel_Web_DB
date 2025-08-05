const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const pool = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const sudokuRoutes = require('./routes/sudokuRoutes');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../../frontend')));

app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    console.log('Request body:', req.body);
    next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/sudoku', sudokuRoutes);

// Test route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/login.html'));
});

// Test database connection
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Start server with HTTPS if SSL certificates are available
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'private-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'certificate.pem'))
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`🚀 Server running on https://localhost:${PORT}`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📱 External access: http://192.168.230.52:${PORT}`);
});
