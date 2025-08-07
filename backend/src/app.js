const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const pool = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const sudokuRoutes = require('./routes/sudokuRoutes');
const SudokuModel = require('./models/sudokuModel');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize server (no longer needed for resets with new daily system)
async function initializeServer() {
    console.log('🎯 Daily scoring system initialized - no periodic resets needed!');
}

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

// Start both HTTP and HTTPS servers on different ports
const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Start HTTPS server
try {
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, 'ssl', 'private-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'ssl', 'certificate.pem'))
    };

    https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`� HTTPS Server running on https://localhost:${HTTPS_PORT}`);
    });
} catch (error) {
    console.log('⚠️  SSL certificates not found, HTTPS server not started');
}

// Start HTTP server
app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP Server running on http://0.0.0.0:${HTTP_PORT}`);
    console.log(`📊 Health check: http://localhost:${HTTP_PORT}/health`);
    console.log(`📱 External access: http://192.168.230.52:${HTTP_PORT}`);
    
    // Initialize server
    initializeServer();
});
