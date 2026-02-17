# Quick Start Guide

Get your WhatsApp Sales Auto-Closer running in 5 minutes!

## Prerequisites

1. **Install Ollama and llama3**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.com/install.sh | sh

   # Pull the llama3 model
   ollama pull llama3

   # Start Ollama (in a separate terminal)
   ollama serve
   ```

2. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)
   - Version 18 or higher required

## Setup Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Products
Edit `products.json` to add your actual products and prices.

### Step 3: Start the Application
```bash
npm start
```

### Step 4: Connect WhatsApp
1. A QR code will appear in your terminal
2. Open WhatsApp on your phone
3. Go to: **Settings → Linked Devices → Link a Device**
4. Scan the QR code
5. Wait for "WhatsApp connected successfully!" message

### Step 5: Test It Out
Send a message to your WhatsApp number from another device and watch the AI respond!

## What Happens Next?

The bot will:
- Greet customers
- Answer questions about products
- Recommend products based on needs
- Ask for name and city
- Guide conversations toward sales
- Save all conversations in the database

## Common Commands

**Start the bot:**
```bash
npm start
```

**View logs:**
Watch the terminal for real-time conversation logs

**Access the API:**
Open `http://localhost:3000` in your browser to see available endpoints

## Testing the AI

Send these messages to test:
- "Hi" - Should greet you
- "I need headphones" - Should recommend products
- "What's the price?" - Should provide pricing info
- "agent" - Should trigger human handoff

## Accessing Data

View your leads and conversations:
- Use the API endpoints (see README.md)
- Check Supabase dashboard
- Query the database directly

## Need Help?

Check `README.md` for detailed documentation and troubleshooting.

## Pro Tips

1. **Customize the AI**: Edit the system prompt in `ai.js` to change behavior
2. **Add More Products**: Update `products.json` anytime
3. **Monitor Performance**: Check `/api/leads/stats` for conversion metrics
4. **Human Takeover**: Have customers say "agent" to flag for human follow-up

---

You're all set! Your AI sales assistant is ready to convert conversations into sales 24/7.
