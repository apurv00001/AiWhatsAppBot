import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI module for WhatsApp Sales Auto-Closer
 * Integrates with local Ollama (llama3) for conversational AI
 */

// Load products data
let productsData = null;

/**
 * Load products from products.json
 * @returns {Promise<Array>} Array of products
 */
async function loadProducts() {
  if (productsData) return productsData;

  try {
    const filePath = path.join(__dirname, 'products.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    productsData = parsed.products;
    return productsData;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}

/**
 * Create system prompt for the AI sales assistant
 * @param {Array} products - Array of available products
 * @returns {string} System prompt
 */
function createSystemPrompt(products) {
  const productList = products.map(p => {
    let details = `${p.name} - $${p.price}`;
    if (p.sizes) details += ` (Sizes: ${p.sizes.join(', ')})`;
    if (p.colors) details += ` (Colors: ${p.colors.join(', ')})`;
    return `- ${details}: ${p.description}`;
  }).join('\n');

  return `You are an expert WhatsApp sales assistant for a local retail business.

=====================
🎯 MAIN GOAL
=====================
Your job is NOT just answering questions.
Your job is to naturally guide customers toward placing an order.

Always move the conversation forward toward purchase.

=====================
🗣 LANGUAGE RULES
=====================
- Detect customer's language automatically.
- Reply ONLY in the same language used by the customer.
- Gujarati → simple conversational Gujarati.
- Hindi → casual spoken Hindi.
- Hinglish → Hinglish.
- Never use formal or textbook language.
- Sound like a friendly local shop salesperson.

=====================
💬 MESSAGE STYLE
=====================
- Keep replies SHORT (1–2 sentences).
- WhatsApp chatting style.
- Friendly and confident.
- Maximum ONE emoji per message.
- Never send long explanations.

=====================
🛒 SALES BEHAVIOR
=====================
Follow this flow naturally:

1. Understand customer need
2. Recommend best product confidently
3. Explain BENEFIT (comfort, look, daily use, value)
4. Reduce doubt politely
5. Ask a small question
6. Move toward confirmation

Always ask one guiding question after replying.

Example:
"Ye ₹799 ka hai 👍 daily wear ke liye best hai. Kaunsa size chahiye?"

=====================
📦 PRODUCT RULES
=====================
- Use ONLY products listed below.
- NEVER invent products, prices, or offers.
- If information is unknown, say:
  "Team delivery details confirm karegi."

=====================
🧠 BUYING INTENT RULE
=====================
If customer sounds ready (yes, ok, confirm, levu che, book karo, haan):
→ Immediately move to order confirmation.
→ Collect Name and City.

=====================
📋 ORDER COLLECTION
=====================
Before confirming order collect:
- Customer Name
- City
- Product choice

Then confirm politely.

Example:
"Perfect 👍 Name aur city bata do, order book kar deta hu."

=====================
👨‍💼 HUMAN HANDOVER
=====================
If customer says:
agent / human / real person

Reply:
"Sure 👍 our team will connect with you shortly."

Stop sales pressure after that.

=====================
✨ TONE EXAMPLES
=====================

Gujarati:
"Aa ₹799 nu che 👍 daily use mate perfect. Tamne kai size joiye?"

Hindi:
"Ye wala best rahega 🙂 comfortable hai. Confirm kar du?"

Hinglish:
"Ye kaafi popular hai 👍 aapko size kaunsa chahiye?"

=====================
AVAILABLE PRODUCTS
=====================
${productList}

Remember:
You are a smart salesperson, not a chatbot.
Be natural, helpful, and gently persuasive.


AVAILABLE PRODUCTS:
${productList}

IMPORTANT RULES:
1. Always be short, friendly, and conversational (like texting a friend)
2. NEVER invent prices, products, or information not in the product list
3. Always try to guide the conversation toward a sale
4. Ask for customer name early in the conversation
5. Ask for their city/location when discussing delivery
6. Recommend products based on customer needs
7. When ready, ask for order confirmation
8. Keep responses under 3 sentences when possible
9. Use emojis occasionally to be friendly
10. If customer says "agent", inform them a human will contact them soon

CONVERSATION FLOW:
1. Greet and ask how you can help
2. Understand customer needs
3. Recommend relevant products
4. Answer questions about products
5. Ask for name if not provided
6. Ask for city/location
7. Confirm order details
8. Thank them and mention next steps

Remember: Be human-like, not robotic. Keep it casual and friendly!`;
}

/**
 * Call Ollama API with chat history
 * @param {Array} chatHistory - Array of message objects with role and content
 * @param {string} systemPrompt - System prompt for AI behavior
 * @returns {Promise<string>} AI response
 */
async function callOllama(chatHistory, systemPrompt) {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3';

    // Format messages for Ollama
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.message || msg.content
      }))
    ];

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw error;
  }
}

/**
 * Extract customer information from conversation
 * @param {string} message - Customer message
 * @param {Array} chatHistory - Previous chat history
 * @returns {Object} Extracted information (name, city)
 */
function extractCustomerInfo(message, chatHistory) {
  const info = {
    name: null,
    city: null
  };

  // Simple name extraction (looks for "my name is" or "I'm")
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /i am (\w+)/i,
    /call me (\w+)/i,
    /this is (\w+)/i
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      info.name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      break;
    }
  }

  // Simple city extraction (looks for "from" or "in")
  const cityPatterns = [
    /from ([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/,
    /in ([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/,
    /live in ([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/,
    /city is ([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/
  ];

  for (const pattern of cityPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      info.city = match[1].trim();
      break;
    }
  }

  return info;
}

/**
 * Check if customer requested human agent
 * @param {string} message - Customer message
 * @returns {boolean} True if agent requested
 */
function isAgentRequested(message) {
  const agentKeywords = ['agent', 'human', 'speak to someone', 'talk to person', 'real person'];
  const lowerMessage = message.toLowerCase();
  return agentKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Find relevant products based on customer message
 * @param {string} message - Customer message
 * @param {Array} products - Available products
 * @returns {Array} Relevant products
 */
function findRelevantProducts(message, products) {
  const lowerMessage = message.toLowerCase();
  const relevantProducts = [];

  for (const product of products) {
    // Check if any keyword matches
    if (product.keywords && product.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
      relevantProducts.push(product);
      continue;
    }

    // Check if category matches
    if (product.category && lowerMessage.includes(product.category.toLowerCase())) {
      relevantProducts.push(product);
      continue;
    }

    // Check if product name matches
    if (lowerMessage.includes(product.name.toLowerCase())) {
      relevantProducts.push(product);
    }
  }

  return relevantProducts.slice(0, 3);
}

/**
 * Generate AI response for customer message
 * @param {string} userMessage - Customer's message
 * @param {Array} chatHistory - Previous conversation history
 * @returns {Promise<Object>} Response with message and metadata
 */
export async function generateResponse(userMessage, chatHistory = []) {
  try {
    // Load products
    const products = await loadProducts();

    // Check if agent is requested
    if (isAgentRequested(userMessage)) {
      return {
        message: "I understand you'd like to speak with a human agent. I've flagged your conversation, and someone from our team will contact you shortly. Is there anything else I can help you with in the meantime?",
        metadata: {
          agentRequested: true
        }
      };
    }

    // Extract customer information
    const extractedInfo = extractCustomerInfo(userMessage, chatHistory);

    // Find relevant products
    const relevantProducts = findRelevantProducts(userMessage, products);

    // Create system prompt
    const systemPrompt = createSystemPrompt(products);

    // Add current message to history for AI
    const fullHistory = [
      ...chatHistory,
      { role: 'user', message: userMessage }
    ];

    // Get AI response
    const aiResponse = await callOllama(fullHistory, systemPrompt);

    return {
      message: aiResponse,
      metadata: {
        extractedInfo,
        relevantProducts: relevantProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price
        })),
        agentRequested: false
      }
    };
  } catch (error) {
    console.error('Error in generateResponse:', error);

    // Fallback response if AI fails
    return {
      message: "I'm having a little trouble right now. Could you please repeat that? 😊",
      metadata: {
        error: true,
        errorMessage: error.message
      }
    };
  }
}

/**
 * Test Ollama connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testOllamaConnection() {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Ollama not responding: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Ollama connected successfully');
    console.log('Available models:', data.models?.map(m => m.name).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Ollama connection failed:', error.message);
    console.error('Make sure Ollama is running: ollama serve');
    return false;
  }
}

export default {
  generateResponse,
  testOllamaConnection,
  loadProducts
};
