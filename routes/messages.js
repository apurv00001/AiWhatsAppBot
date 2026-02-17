import express from 'express';
import { sendMessage, sendMessageWithTyping, broadcastMessage, formatPhoneNumber, isWhatsAppConnected } from '../whatsapp.js';
import { getChatHistory, clearChatHistory } from '../database.js';

const router = express.Router();

/**
 * Routes for managing messages and chat
 */

/**
 * POST /api/messages/send
 * Send a message to a phone number
 */
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message, withTyping = true } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);

    // Send message
    if (withTyping) {
      await sendMessageWithTyping(formattedNumber, message);
    } else {
      await sendMessage(formattedNumber, message);
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        phoneNumber: formattedNumber,
        message
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message
    });
  }
});

/**
 * POST /api/messages/broadcast
 * Broadcast message to multiple phone numbers
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { phoneNumbers, message } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Phone numbers array is required'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Format all phone numbers
    const formattedNumbers = phoneNumbers.map(formatPhoneNumber);

    // Broadcast message
    const results = await broadcastMessage(formattedNumbers, message);

    res.json({
      success: true,
      message: 'Broadcast completed',
      data: results
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message',
      message: error.message
    });
  }
});

/**
 * GET /api/messages/history/:phoneNumber
 * Get chat history for a phone number
 */
router.get('/history/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);

    const history = await getChatHistory(formattedNumber, limit);

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
      message: error.message
    });
  }
});

/**
 * DELETE /api/messages/history/:phoneNumber
 * Clear chat history for a phone number
 */
router.delete('/history/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);

    await clearChatHistory(formattedNumber);

    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history',
      message: error.message
    });
  }
});

/**
 * GET /api/messages/status
 * Get WhatsApp connection status
 */
router.get('/status', (req, res) => {
  try {
    const connected = isWhatsAppConnected();

    res.json({
      success: true,
      data: {
        connected,
        status: connected ? 'online' : 'offline'
      }
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status',
      message: error.message
    });
  }
});

export default router;
