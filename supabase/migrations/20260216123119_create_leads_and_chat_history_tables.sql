/*
  # Create Leads and Chat History Tables for WhatsApp Sales Auto-Closer

  ## Overview
  This migration creates the core database schema for an AI-powered WhatsApp sales chatbot.
  It includes tables for managing customer leads and maintaining conversation history.

  ## New Tables

  ### 1. `leads`
  Stores customer information collected during sales conversations.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each lead
  - `phone_number` (text, unique, required) - Customer's WhatsApp phone number
  - `customer_name` (text, nullable) - Customer's name
  - `city` (text, nullable) - Customer's city
  - `status` (text, default 'new') - Lead status: 'new', 'contacted', 'qualified', 'converted', 'lost'
  - `needs_human_agent` (boolean, default false) - Flag indicating if customer requested human assistance
  - `last_message_at` (timestamptz) - Timestamp of last conversation
  - `created_at` (timestamptz, default now()) - Record creation timestamp
  - `updated_at` (timestamptz, default now()) - Record last update timestamp

  ### 2. `chat_history`
  Maintains conversation memory for contextual AI responses.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each message
  - `lead_id` (uuid, foreign key -> leads.id) - Reference to the lead
  - `phone_number` (text, required) - Customer's phone number for quick lookup
  - `role` (text, required) - Message sender: 'user' or 'assistant'
  - `message` (text, required) - Message content
  - `metadata` (jsonb, nullable) - Additional data (products mentioned, etc.)
  - `created_at` (timestamptz, default now()) - Message timestamp

  ### 3. `orders`
  Tracks confirmed orders from customers.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each order
  - `lead_id` (uuid, foreign key -> leads.id) - Reference to the lead
  - `phone_number` (text, required) - Customer's phone number
  - `products` (jsonb, required) - Array of ordered products with quantities
  - `total_amount` (decimal, nullable) - Total order amount
  - `status` (text, default 'pending') - Order status
  - `notes` (text, nullable) - Additional order notes
  - `created_at` (timestamptz, default now()) - Order creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies allow authenticated users to manage all data
  - This is suitable for internal business operations

  ## Indexes
  - Index on phone_number for fast lookups
  - Index on created_at for chronological queries
  - Index on lead_id in chat_history for efficient conversation retrieval
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  customer_name text,
  city text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  needs_human_agent boolean DEFAULT false,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  products jsonb NOT NULL,
  total_amount decimal(10, 2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_lead_id ON chat_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_phone_number ON chat_history(phone_number);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_lead_id ON orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone_number ON orders(phone_number);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for leads table
CREATE POLICY "Allow authenticated users to read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for chat_history table
CREATE POLICY "Allow authenticated users to read chat_history"
  ON chat_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert chat_history"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update chat_history"
  ON chat_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete chat_history"
  ON chat_history FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for orders table
CREATE POLICY "Allow authenticated users to read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);