import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Database operations for WhatsApp Sales Auto-Closer
 * Handles leads, chat history, and orders using Supabase
 */

// ==================== LEAD OPERATIONS ====================

/**
 * Get or create a lead by phone number
 * @param {string} phoneNumber - Customer's WhatsApp phone number
 * @returns {Promise<Object>} Lead record
 */
export async function getOrCreateLead(phoneNumber) {
  try {
    // Check if lead exists
    const { data: existingLead, error: selectError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (selectError) throw selectError;

    // If lead exists, update last_message_at
    if (existingLead) {
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedLead;
    }

    // Create new lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        phone_number: phoneNumber,
        status: 'new',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return newLead;
  } catch (error) {
    console.error('Error in getOrCreateLead:', error);
    throw error;
  }
}

/**
 * Update lead information
 * @param {string} leadId - Lead ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated lead record
 */
export async function updateLead(leadId, updates) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updateLead:', error);
    throw error;
  }
}

/**
 * Mark lead as needing human agent
 * @param {string} phoneNumber - Customer's phone number
 * @returns {Promise<Object>} Updated lead record
 */
export async function markForHumanAgent(phoneNumber) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        needs_human_agent: true,
        status: 'qualified',
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in markForHumanAgent:', error);
    throw error;
  }
}

/**
 * Get all leads with optional filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Array of lead records
 */
export async function getLeads(filters = {}) {
  try {
    let query = supabase.from('leads').select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.needs_human_agent !== undefined) {
      query = query.eq('needs_human_agent', filters.needs_human_agent);
    }

    query = query.order('last_message_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getLeads:', error);
    throw error;
  }
}

// ==================== CHAT HISTORY OPERATIONS ====================

/**
 * Save a message to chat history
 * @param {string} leadId - Lead ID
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} role - 'user' or 'assistant'
 * @param {string} message - Message content
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Chat history record
 */
export async function saveChatMessage(leadId, phoneNumber, role, message, metadata = null) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .insert({
        lead_id: leadId,
        phone_number: phoneNumber,
        role: role,
        message: message,
        metadata: metadata
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in saveChatMessage:', error);
    throw error;
  }
}

/**
 * Get chat history for a phone number
 * @param {string} phoneNumber - Customer's phone number
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array>} Array of chat messages
 */
export async function getChatHistory(phoneNumber, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    throw error;
  }
}

/**
 * Clear chat history for a phone number (useful for testing)
 * @param {string} phoneNumber - Customer's phone number
 * @returns {Promise<void>}
 */
export async function clearChatHistory(phoneNumber) {
  try {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('phone_number', phoneNumber);

    if (error) throw error;
  } catch (error) {
    console.error('Error in clearChatHistory:', error);
    throw error;
  }
}

// ==================== ORDER OPERATIONS ====================

/**
 * Create a new order
 * @param {string} leadId - Lead ID
 * @param {string} phoneNumber - Customer's phone number
 * @param {Array} products - Array of products with quantities
 * @param {number} totalAmount - Total order amount
 * @param {string} notes - Additional notes
 * @returns {Promise<Object>} Order record
 */
export async function createOrder(leadId, phoneNumber, products, totalAmount = null, notes = null) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        lead_id: leadId,
        phone_number: phoneNumber,
        products: products,
        total_amount: totalAmount,
        status: 'pending',
        notes: notes
      })
      .select()
      .single();

    if (error) throw error;

    // Update lead status to converted
    await updateLead(leadId, { status: 'converted' });

    return data;
  } catch (error) {
    console.error('Error in createOrder:', error);
    throw error;
  }
}

/**
 * Get orders for a phone number
 * @param {string} phoneNumber - Customer's phone number
 * @returns {Promise<Array>} Array of order records
 */
export async function getOrders(phoneNumber) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error in getOrders:', error);
    throw error;
  }
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order record
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    throw error;
  }
}

// ==================== ANALYTICS OPERATIONS ====================

/**
 * Get statistics for the dashboard
 * @returns {Promise<Object>} Statistics object
 */
export async function getStatistics() {
  try {
    // Get total leads
    const { count: totalLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (leadsError) throw leadsError;

    // Get converted leads
    const { count: convertedLeads, error: convertedError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted');

    if (convertedError) throw convertedError;

    // Get leads needing human agent
    const { count: needsAgent, error: agentError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('needs_human_agent', true);

    if (agentError) throw agentError;

    // Get total orders
    const { count: totalOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (ordersError) throw ordersError;

    return {
      totalLeads: totalLeads || 0,
      convertedLeads: convertedLeads || 0,
      needsHumanAgent: needsAgent || 0,
      totalOrders: totalOrders || 0,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Error in getStatistics:', error);
    throw error;
  }
}

export default {
  getOrCreateLead,
  updateLead,
  markForHumanAgent,
  getLeads,
  saveChatMessage,
  getChatHistory,
  clearChatHistory,
  createOrder,
  getOrders,
  updateOrderStatus,
  getStatistics
};
