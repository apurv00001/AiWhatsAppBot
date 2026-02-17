/*
  # Fix Security Issues: Drop Unused Indexes and Restrict RLS Policies

  ## Changes

  ### 1. Drop Unused Indexes
  Removing indexes that have not been used to reduce database overhead:
  - idx_orders_lead_id
  - idx_leads_phone_number
  - idx_leads_created_at
  - idx_chat_history_lead_id
  - idx_chat_history_phone_number
  - idx_chat_history_created_at
  - idx_orders_phone_number

  ### 2. Fix RLS Policies
  Replace overly permissive "always true" policies with restrictive ones.
  
  Note: The application uses SUPABASE_SERVICE_ROLE_KEY for all database operations,
  which bypasses RLS. These restrictive policies serve as defense-in-depth for 
  internal business operations where all authenticated users are trusted employees.
  
  The policies now:
  - Explicitly deny by default (no unrestricted access)
  - Allow service role to perform all operations
  - Are restrictive for authenticated users (may need service role)

  ## Security Improvement
  - Eliminates "always true" policy warnings
  - Reduces database performance overhead
  - Maintains defense-in-depth security posture
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_orders_lead_id;
DROP INDEX IF EXISTS idx_leads_phone_number;
DROP INDEX IF EXISTS idx_leads_created_at;
DROP INDEX IF EXISTS idx_chat_history_lead_id;
DROP INDEX IF EXISTS idx_chat_history_phone_number;
DROP INDEX IF EXISTS idx_chat_history_created_at;
DROP INDEX IF EXISTS idx_orders_phone_number;

-- Drop overly permissive RLS policies from leads table
DROP POLICY IF EXISTS "Allow authenticated users to read leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated users to delete leads" ON leads;

-- Drop overly permissive RLS policies from chat_history table
DROP POLICY IF EXISTS "Allow authenticated users to read chat_history" ON chat_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat_history" ON chat_history;
DROP POLICY IF EXISTS "Allow authenticated users to update chat_history" ON chat_history;
DROP POLICY IF EXISTS "Allow authenticated users to delete chat_history" ON chat_history;

-- Drop overly permissive RLS policies from orders table
DROP POLICY IF EXISTS "Allow authenticated users to read orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to insert orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to update orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to delete orders" ON orders;

-- Create restrictive policies for leads table
CREATE POLICY "Service role can manage leads"
  ON leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create restrictive policies for chat_history table
CREATE POLICY "Service role can manage chat_history"
  ON chat_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create restrictive policies for orders table
CREATE POLICY "Service role can manage orders"
  ON orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);