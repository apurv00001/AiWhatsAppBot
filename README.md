# WhatsApp Sales Auto-Closer

A production-ready Node.js application that uses AI to automatically handle sales conversations on WhatsApp. Built for small businesses to convert conversations into sales 24/7.

## Features

- 🤖 **AI-Powered Responses**: Uses local Ollama (llama3) for intelligent, context-aware responses
- 💬 **WhatsApp Integration**: Seamless integration using Baileys library
- 📊 **Lead Management**: Track customers, conversations, and orders in Supabase
- 🧠 **Chat Memory**: Maintains conversation context per user
- 👤 **Human Takeover**: Easy handoff to human agents when requested
- 📦 **Product Recommendations**: Smart product suggestions based on customer needs
- 🎯 **Sales-Focused**: AI trained to guide conversations toward conversions

## Tech Stack

- **Backend**: Node.js with Express
- **WhatsApp**: Baileys (WhatsApp Web API)
- **AI**: Ollama (llama3 model)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Multi-device WhatsApp auth

## Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v18 or higher)
2. **Ollama** installed and running
   ```bash
   # Install Ollama (macOS/Linux)
   curl -fsSL https://ollama.com/install.sh | sh

   # Pull llama3 model
   ollama pull llama3

   # Start Ollama server
   ollama serve
   ```
3. **Supabase Account** (free tier works great)
4. **WhatsApp Account** for business use

## Installation

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   The `.env` file is already configured with Supabase credentials. Verify these settings:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `OLLAMA_URL`: Ollama API endpoint (default: http://localhost:11434)
   - `OLLAMA_MODEL`: AI model to use (default: llama3)
   - `PORT`: Server port (default: 3000)

4. **Customize your products**

   Edit `products.json` to add your business products:
   ```json
   {
     "products": [
       {
         "id": "PROD001",
         "name": "Your Product Name",
         "description": "Product description",
         "price": 29.99,
         "currency": "USD",
         "category": "Category",
         "keywords": ["keyword1", "keyword2"]
       }
     ]
   }
   ```

## Usage

### Start the Application

```bash
npm start
```

### First-Time Setup

1. When you start the app for the first time, a QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to: **Settings → Linked Devices → Link a Device**
4. Scan the QR code displayed in the terminal
5. Once connected, the bot will start handling messages automatically

### API Endpoints

The server exposes REST API endpoints for management:

#### Health Check
```bash
GET /health
```

#### Lead Management
```bash
# Get all leads
GET /api/leads

# Get leads with filters
GET /api/leads?status=new&needs_human_agent=true

# Get statistics
GET /api/leads/stats

# Update lead
PUT /api/leads/:id
{
  "customer_name": "John Doe",
  "city": "New York",
  "status": "qualified"
}
```

#### Message Management
```bash
# Send message
POST /api/messages/send
{
  "phoneNumber": "1234567890",
  "message": "Hello from our bot!",
  "withTyping": true
}

# Broadcast message
POST /api/messages/broadcast
{
  "phoneNumbers": ["1234567890", "0987654321"],
  "message": "New promotion available!"
}

# Get chat history
GET /api/messages/history/:phoneNumber?limit=50

# Clear chat history
DELETE /api/messages/history/:phoneNumber

# Check WhatsApp status
GET /api/messages/status
```

#### Order Management
```bash
# Create order
POST /api/orders
{
  "leadId": "uuid",
  "phoneNumber": "1234567890",
  "products": [
    {"id": "PROD001", "quantity": 2, "name": "Product Name", "price": 29.99}
  ],
  "totalAmount": 59.98,
  "notes": "Customer notes"
}

# Get orders
GET /api/orders/:phoneNumber

# Update order status
PUT /api/orders/:orderId/status
{
  "status": "confirmed"
}
```

## AI Behavior

The AI assistant is configured to:

- Always be friendly and conversational
- Guide conversations toward sales
- Ask for customer name and city
- Recommend products based on needs
- Never invent prices or products
- Handle agent handoff requests
- Keep responses short and natural

### Customer Commands

- **"agent"** or **"human"**: Transfers conversation to human agent
- Any product-related keyword: Triggers product recommendations

## Database Schema

### Leads Table
Stores customer information and conversation status.

### Chat History Table
Maintains conversation context for each customer.

### Orders Table
Tracks confirmed orders and their status.

## Project Structure

```
whatsapp-sales-ai/
├── server.js           # Main application entry point
├── whatsapp.js         # WhatsApp/Baileys integration
├── ai.js              # Ollama AI integration
├── database.js        # Supabase database operations
├── products.json      # Your product catalog
├── routes/
│   ├── leads.js       # Lead management endpoints
│   ├── messages.js    # Message handling endpoints
│   └── orders.js      # Order management endpoints
├── .env               # Environment configuration
└── package.json       # Dependencies
```

## Customization

### Modify AI Behavior

Edit the system prompt in `ai.js` (line 30) to change how the AI behaves:

```javascript
function createSystemPrompt(products) {
  return `You are a friendly sales assistant...
  // Customize this prompt
  `;
}
```

### Add Custom Routes

Create new route files in the `routes/` directory and import them in `server.js`:

```javascript
import customRouter from './routes/custom.js';
app.use('/api/custom', customRouter);
```

### Extend Database Schema

Add new tables or columns using Supabase migrations. Use the MCP tools:

```javascript
await supabase.from('new_table').insert({...});
```

## Production Deployment

### Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting on API endpoints
- [ ] Set up proper CORS policies
- [ ] Use HTTPS in production
- [ ] Monitor for suspicious activity
- [ ] Backup database regularly

### Recommended Hosting

- **Backend**: Railway, Render, DigitalOcean, AWS EC2
- **Database**: Supabase (included)
- **AI**: Self-hosted Ollama or cloud alternative

### Environment Variables for Production

Update `.env` for production:
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_url
SUPABASE_SERVICE_ROLE_KEY=your_production_key
OLLAMA_URL=your_ollama_url
```

## Troubleshooting

### WhatsApp Not Connecting

1. Make sure you have a stable internet connection
2. Delete `auth_info_baileys/` folder and scan QR code again
3. Check if WhatsApp Web is working in your browser
4. Ensure your phone has an active WhatsApp account

### Ollama Errors

1. Verify Ollama is running: `ollama serve`
2. Check if llama3 is installed: `ollama list`
3. Pull the model if missing: `ollama pull llama3`
4. Test connection: `curl http://localhost:11434/api/tags`

### Database Connection Issues

1. Verify Supabase credentials in `.env`
2. Check if tables are created (should be automatic)
3. Ensure RLS policies are set correctly
4. Check Supabase dashboard for error logs

### AI Responses Are Slow

1. Use a smaller model (try `llama3.1` or `mistral`)
2. Increase Ollama timeout settings
3. Consider using cloud-hosted AI (OpenAI, Anthropic)
4. Check system resources (CPU, RAM)

## Development

### Run in Development Mode

```bash
npm run dev
```

### Test Components

```javascript
// Test Ollama connection
import { testOllamaConnection } from './ai.js';
await testOllamaConnection();

// Test database
import { getStatistics } from './database.js';
const stats = await getStatistics();
console.log(stats);
```

### Debug Mode

Enable verbose logging:
```javascript
// In whatsapp.js, change logger level
logger: pino({ level: 'debug' })
```

## Contributing

This is a production-ready template. Feel free to:

- Add new features
- Improve AI prompts
- Enhance error handling
- Add unit tests
- Create a web dashboard

## License

ISC License - Free for personal and commercial use

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Baileys documentation
3. Check Ollama documentation
4. Review Supabase documentation

## Acknowledgments

- **Baileys**: WhatsApp Web API implementation
- **Ollama**: Local AI model hosting
- **Supabase**: Backend and database platform
- **Express**: Web framework

---

Built with ❤️ for small businesses wanting to automate sales conversations
