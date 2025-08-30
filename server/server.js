const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const tableRoutes = require('./routes/tableRoutes');
const planRoutes = require('./routes/planroutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const http = require('http');
const { Server } = require('socket.io');
const planCheck = require('./middleware/plancheck');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.145.160:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global.io = io;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.145.160:3001'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/analytics', analyticsRoutes);

// Apply planCheck middleware to protected routes
app.use('/api/menu', planCheck);
app.use('/api/orders', planCheck);
app.use('/api/reviews', planCheck);
app.use('/api/tables', planCheck);
app.use('/api/users/account', planCheck);
app.use('/api/analytics', planCheck);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
sequelize.sync({ force: false }).then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to sync database:', err);
});