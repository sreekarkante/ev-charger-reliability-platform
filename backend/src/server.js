require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { prisma } = require('./config/db');
const { initSockets } = require('./sockets/socketManager');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const stationRoutes = require('./routes/stationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // In production, replace with specific frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Setup HTTP Server & Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Socket listeners
initSockets(io);

// Database connection check & server boot
const startServer = async () => {
  try {
    console.log('[STARTING SERVER] Checking database connectivity...');
    await prisma.$connect();
    console.log('[DATABASE CONNECTED] PostgreSQL connection verified via Prisma.');

    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`  EV CHARGER RELIABILITY SERVER IS ONLINE`);
      console.log(`  Running on HTTP Port: ${PORT}`);
      console.log(`  WebSocket Server: Enabled & Synced`);
      console.log(`  Local Address: http://localhost:${PORT}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('===================================================');
    console.error('  [DATABASE CONNECTION ERROR] Prisma failed to connect!');
    console.error('  Error Detail:', error.message);
    console.error('---------------------------------------------------');
    console.error('  Please ensure:');
    console.error('  1. PostgreSQL is running on your system');
    console.error('  2. The DATABASE_URL connection string in backend/.env is correct');
    console.error('  3. You have run the migrations: npm run prisma:migrate');
    console.error('===================================================');
    
    // We start the server anyway so the frontend can still display friendly connection errors
    server.listen(PORT, () => {
      console.log(`[BOOTING] Server started in DB offline-mode on port ${PORT} for diagnostics.`);
    });
  }
};

startServer();
