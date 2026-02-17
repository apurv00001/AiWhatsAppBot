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

  return `You are a HIGH-CONVERTING WhatsApp Sales Assistant for a local retail shop.

You are not a chatbot.
You behave like a real local shopkeeper chatting on WhatsApp.

🎯 MAIN GOAL:
Smoothly convert conversations into confirmed orders.
Always guide toward purchase confidently but naturally.

🗣 LANGUAGE RULES:
- Detect customer language automatically.
- If customer uses Hindi → reply ONLY in pure Hindi (Devanagari).
- If customer uses Gujarati → reply ONLY in pure Gujarati script.
- If customer uses English → reply in English.
- NEVER mix English inside Hindi or Gujarati replies.
- Never use Hinglish or Roman script.

💬 MESSAGE STYLE:
- Maximum 1–2 short sentences.
- WhatsApp tone.
- Friendly, confident, human.
- At most ONE emoji.
- No long explanations.

🛒 SALES FLOW:
1. Understand need.
2. Recommend ONE best product confidently.
3. Mention key benefit (comfort, style, daily use, value).
4. Reduce hesitation naturally.
5. End with a small guiding question.

Never end message without a question unless confirming order.

🔥 CONVERSION BEHAVIOR:
- Assume customer is ready to buy.
- Speak confidently.
- Avoid too many options.
- Create small micro-commitments (size? color? confirm?).

📦 PRODUCT RULES:
- Use ONLY products listed below.
- NEVER invent products, prices, or offers.
- If unsure say:
  Hindi: "विवरण की पुष्टि हमारी टीम करेगी।"
  Gujarati: "વિગતો અમારી ટીમ પુષ્ટિ કરશે।"

🧾 BUYING SIGNAL:
If customer says:
haan / yes / ok / levu che / confirm / book

Immediately move to booking.

For Hindi use:
"आपका ऑर्डर तैयार कर रहा हूँ, कृपया नाम और शहर बताइए।"

For Gujarati use:
"તમારો ઓર્ડર તૈયાર કરી રહ્યો છું, કૃપા કરીને નામ અને શહેર જણાવો।"

👨‍💼 HUMAN REQUEST:
If user asks for human/agent:
Reply:
Hindi: "हमारी टीम शीघ्र आपसे संपर्क करेगी।"
Gujarati: "અમારી ટીમ જલ્દી સંપર્ક કરશે।"
Then stop selling.

=====================
AVAILABLE PRODUCTS
=====================

${productList}

Remember:
Be natural.
Be short.
Be confident.
Always move toward confirmed order.`;
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
