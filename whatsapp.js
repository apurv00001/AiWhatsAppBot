import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { getOrCreateLead, saveChatMessage, getChatHistory, markForHumanAgent, updateLead } from './database.js';
import { generateResponse } from './ai.js';

/**
 * WhatsApp Integration using Baileys
 * Handles message receiving, processing, and sending
 */

let sock = null;
let isConnected = false;

/**
 * Initialize WhatsApp connection
 * @returns {Promise<void>}
 */
export async function initWhatsApp() {
  try {
    // Create auth directory for session storage
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    // Get latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version.join('.')}, Latest: ${isLatest}`);

    // Create socket connection
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      generateHighQualityLinkPreview: true
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Display QR code for scanning
      if (qr) {
        console.log('\n📱 Scan this QR code with WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('\nOpen WhatsApp > Linked Devices > Link a Device > Scan QR Code\n');
      }

      // Handle connection status
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('❌ WhatsApp connection closed. Reconnecting:', shouldReconnect);

        if (shouldReconnect) {
          setTimeout(() => initWhatsApp(), 3000);
        }

        isConnected = false;
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully!');
        isConnected = true;
      }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        await handleIncomingMessage(msg);
      }
    });

  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    throw error;
  }
}

/**
 * Handle incoming WhatsApp message
 * @param {Object} message - WhatsApp message object
 */
async function handleIncomingMessage(message) {
  try {
    // Ignore messages from groups and status updates
    if (message.key.remoteJid.includes('@g.us') || message.key.remoteJid === 'status@broadcast') {
      return;
    }

    // Ignore messages from self
    if (message.key.fromMe) {
      return;
    }

    // Extract message details
    const phoneNumber = message.key.remoteJid;
    const messageText = message.message?.conversation ||
                       message.message?.extendedTextMessage?.text ||
                       '';

    if (!messageText) {
      return;
    }

    console.log(`\n📨 Message from ${phoneNumber}: ${messageText}`);

    // Get or create lead
    const lead = await getOrCreateLead(phoneNumber);

    // Save user message to chat history
    await saveChatMessage(lead.id, phoneNumber, 'user', messageText);

    // Check if lead needs human agent
    if (lead.needs_human_agent) {
      await sendMessage(phoneNumber, "A human agent will contact you soon! 👋");
      return;
    }

    // Get chat history for context
    const chatHistory = await getChatHistory(phoneNumber, 10);

    // Generate AI response
    const response = await generateResponse(messageText, chatHistory);

    // Handle agent request
    if (response.metadata?.agentRequested) {
      await markForHumanAgent(phoneNumber);
    }

    // Extract and update customer info if available
    if (response.metadata?.extractedInfo) {
      const updates = {};
      if (response.metadata.extractedInfo.name) {
        updates.customer_name = response.metadata.extractedInfo.name;
      }
      if (response.metadata.extractedInfo.city) {
        updates.city = response.metadata.extractedInfo.city;
      }
      if (Object.keys(updates).length > 0) {
        await updateLead(lead.id, updates);
      }
    }

    // Save assistant message to chat history
    await saveChatMessage(lead.id, phoneNumber, 'assistant', response.message, response.metadata);

    // Send response to customer
    await sendMessage(phoneNumber, response.message);

    console.log(`✅ Response sent to ${phoneNumber}`);

  } catch (error) {
    console.error('Error handling message:', error);

    // Send error message to customer
    try {
      const phoneNumber = message.key.remoteJid;
      await sendMessage(phoneNumber, "Sorry, I'm having technical difficulties. Please try again in a moment. 😊");
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
}

/**
 * Send a message to a WhatsApp number
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} text - Message text
 * @returns {Promise<void>}
 */
export async function sendMessage(phoneNumber, text) {
  try {
    if (!sock || !isConnected) {
      throw new Error('WhatsApp is not connected');
    }

    await sock.sendMessage(phoneNumber, { text });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send a message with typing indicator
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} text - Message text
 * @returns {Promise<void>}
 */
export async function sendMessageWithTyping(phoneNumber, text) {
  try {
    if (!sock || !isConnected) {
      throw new Error('WhatsApp is not connected');
    }

    // Show typing indicator
    await sock.sendPresenceUpdate('composing', phoneNumber);

    // Simulate typing delay (1-2 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Send message
    await sock.sendMessage(phoneNumber, { text });

    // Set presence to available
    await sock.sendPresenceUpdate('available', phoneNumber);
  } catch (error) {
    console.error('Error sending message with typing:', error);
    throw error;
  }
}

/**
 * Get WhatsApp connection status
 * @returns {boolean} Connection status
 */
export function isWhatsAppConnected() {
  return isConnected;
}

/**
 * Get WhatsApp socket instance
 * @returns {Object} Socket instance
 */
export function getSocket() {
  return sock;
}

/**
 * Broadcast message to multiple numbers
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {string} text - Message text
 * @returns {Promise<Object>} Results object with success and failed sends
 */
export async function broadcastMessage(phoneNumbers, text) {
  const results = {
    success: [],
    failed: []
  };

  for (const phoneNumber of phoneNumbers) {
    try {
      await sendMessage(phoneNumber, text);
      results.success.push(phoneNumber);

      // Add delay between messages to avoid spam detection
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to send to ${phoneNumber}:`, error);
      results.failed.push({ phoneNumber, error: error.message });
    }
  }

  return results;
}

/**
 * Format phone number to WhatsApp format
 * @param {string} phoneNumber - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phoneNumber) {
  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Add country code if not present (assuming US +1)
  if (!cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }

  // Add @s.whatsapp.net suffix
  return cleaned + '@s.whatsapp.net';
}

export default {
  initWhatsApp,
  sendMessage,
  sendMessageWithTyping,
  isWhatsAppConnected,
  getSocket,
  broadcastMessage,
  formatPhoneNumber
};
