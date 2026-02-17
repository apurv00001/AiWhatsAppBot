import express from 'express';
import dotenv from 'dotenv';
import { initWhatsApp } from './whatsapp.js';
import { testOllamaConnection } from './ai.js';
import leadsRouter from './routes/leads.js';
import messagesRouter from './routes/messages.js';
import ordersRouter from './routes/orders.js';

dotenv.config();

/**
 * Main server for WhatsApp Sales Auto-Closer
 * Production-ready Node.js application with Express, Baileys, and Ollama
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for API access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Sales Auto-Closer is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/leads', leadsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/orders', ordersRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Sales Auto-Closer API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      leads: {
        list: 'GET /api/leads',
        stats: 'GET /api/leads/stats',
        update: 'PUT /api/leads/:id'
      },
      messages: {
        send: 'POST /api/messages/send',
        broadcast: 'POST /api/messages/broadcast',
        history: 'GET /api/messages/history/:phoneNumber',
        clearHistory: 'DELETE /api/messages/history/:phoneNumber',
        status: 'GET /api/messages/status'
      },
      orders: {
        create: 'POST /api/orders',
        list: 'GET /api/orders/:phoneNumber',
        updateStatus: 'PUT /api/orders/:orderId/status'
      }
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

/**
 * Initialize application
 */
async function startServer() {
  try {
    console.log('🚀 Starting WhatsApp Sales Auto-Closer...\n');

    // Check required environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      console.error('Please create a .env file with the required variables.\n');
      process.exit(1);
    }

    // Test Ollama connection
    console.log('🤖 Testing Ollama AI connection...');
    const ollamaConnected = await testOllamaConnection();

    if (!ollamaConnected) {
      console.warn('⚠️  Ollama is not running. Start it with: ollama serve');
      console.warn('⚠️  Make sure llama3 model is installed: ollama pull llama3\n');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✅ Express server running on port ${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
    });

    // Initialize WhatsApp
    console.log('📱 Initializing WhatsApp connection...');
    await initWhatsApp();

    console.log('\n✅ Application started successfully!');
    console.log('📝 Logs will appear below as messages are received.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();
