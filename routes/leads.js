import express from 'express';
import { getLeads, updateLead, getStatistics } from '../database.js';

const router = express.Router();

/**
 * Routes for managing leads and customer data
 */

/**
 * GET /api/leads
 * Get all leads with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.needs_human_agent !== undefined) {
      filters.needs_human_agent = req.query.needs_human_agent === 'true';
    }

    const leads = await getLeads(filters);

    res.json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/stats
 * Get lead statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * PUT /api/leads/:id
 * Update lead information
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate allowed fields
    const allowedFields = ['customer_name', 'city', 'status', 'needs_human_agent'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const updatedLead = await updateLead(id, filteredUpdates);

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
      message: error.message
    });
  }
});

export default router;
