import express from 'express';
import { createOrder, getOrders, updateOrderStatus } from '../database.js';
import { formatPhoneNumber } from '../whatsapp.js';

const router = express.Router();

/**
 * Routes for managing orders
 */

/**
 * POST /api/orders
 * Create a new order
 */
router.post('/', async (req, res) => {
  try {
    const { leadId, phoneNumber, products, totalAmount, notes } = req.body;

    if (!leadId || !phoneNumber || !products) {
      return res.status(400).json({
        success: false,
        error: 'Lead ID, phone number, and products are required'
      });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Products must be a non-empty array'
      });
    }

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);

    const order = await createOrder(
      leadId,
      formattedNumber,
      products,
      totalAmount,
      notes
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/:phoneNumber
 * Get orders for a phone number
 */
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // Format phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);

    const orders = await getOrders(formattedNumber);

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

/**
 * PUT /api/orders/:orderId/status
 * Update order status
 */
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedOrder = await updateOrderStatus(orderId, status);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
      message: error.message
    });
  }
});

export default router;
