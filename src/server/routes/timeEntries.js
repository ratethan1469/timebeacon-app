const express = require('express');
const TimeEntry = require('../../models/TimeEntry');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get time entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, userId, projectId } = req.query;
    
    let query = {
      companyId: req.user.companyId,
      isActive: true
    };

    // Apply filters based on user permissions
    if (req.permissionScope === 'own' || (!req.permissionScope && req.user.role === 'employee')) {
      query.userId = req.user.userId;
    } else if (userId) {
      query.userId = userId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (projectId) {
      query.projectId = projectId;
    }

    const timeEntries = await TimeEntry.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('projectId', 'name color')
      .populate('clientId', 'name color')
      .sort({ date: -1, startTime: -1 });

    res.json({
      timeEntries: timeEntries.map(entry => ({
        id: entry._id,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        description: entry.description,
        status: entry.status,
        isBillable: entry.isBillable,
        hourlyRate: entry.hourlyRate,
        tags: entry.tags,
        aiGenerated: entry.aiGenerated,
        aiSource: entry.aiSource,
        aiConfidence: entry.aiConfidence,
        user: entry.userId,
        project: entry.projectId,
        client: entry.clientId,
        createdAt: entry.createdAt
      }))
    });

  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({
      error: 'Failed to get time entries'
    });
  }
});

// Create time entry
router.post('/', authenticateToken, requirePermission('timeEntries', 'create'), async (req, res) => {
  try {
    const timeEntryData = {
      ...req.body,
      companyId: req.user.companyId,
      userId: req.user.userId
    };

    const timeEntry = new TimeEntry(timeEntryData);
    await timeEntry.save();

    await timeEntry.populate([
      { path: 'userId', select: 'firstName lastName email' },
      { path: 'projectId', select: 'name color' },
      { path: 'clientId', select: 'name color' }
    ]);

    res.status(201).json({
      message: 'Time entry created successfully',
      timeEntry: {
        id: timeEntry._id,
        date: timeEntry.date,
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime,
        duration: timeEntry.duration,
        description: timeEntry.description,
        status: timeEntry.status,
        isBillable: timeEntry.isBillable,
        user: timeEntry.userId,
        project: timeEntry.projectId,
        client: timeEntry.clientId
      }
    });

  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({
      error: 'Failed to create time entry'
    });
  }
});

// Update time entry
router.put('/:entryId', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;
    const updates = req.body;

    let query = {
      _id: entryId,
      companyId: req.user.companyId
    };

    // Users can only update their own entries unless they have broader permissions
    if (req.permissionScope === 'own' || (!req.permissionScope && req.user.role === 'employee')) {
      query.userId = req.user.userId;
    }

    const timeEntry = await TimeEntry.findOneAndUpdate(
      query,
      { 
        $set: updates,
        $push: {
          modificationHistory: {
            modifiedBy: req.user.userId,
            changes: updates,
            reason: req.body.modificationReason
          }
        }
      },
      { new: true }
    ).populate([
      { path: 'userId', select: 'firstName lastName email' },
      { path: 'projectId', select: 'name color' },
      { path: 'clientId', select: 'name color' }
    ]);

    if (!timeEntry) {
      return res.status(404).json({
        error: 'Time entry not found or access denied'
      });
    }

    res.json({
      message: 'Time entry updated successfully',
      timeEntry: {
        id: timeEntry._id,
        date: timeEntry.date,
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime,
        duration: timeEntry.duration,
        description: timeEntry.description,
        status: timeEntry.status,
        user: timeEntry.userId,
        project: timeEntry.projectId,
        client: timeEntry.clientId
      }
    });

  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({
      error: 'Failed to update time entry'
    });
  }
});

// Get entries requiring approval (managers only)
router.get('/pending-approval', authenticateToken, requirePermission('timeEntries', 'approve'), async (req, res) => {
  try {
    const entries = await TimeEntry.getEntriesForReview(req.user.companyId, req.user.userId);

    res.json({
      pendingEntries: entries.map(entry => ({
        id: entry._id,
        date: entry.date,
        description: entry.description,
        duration: entry.duration,
        aiSource: entry.aiSource,
        aiConfidence: entry.aiConfidence,
        user: entry.userId,
        project: entry.projectId,
        client: entry.clientId,
        createdAt: entry.createdAt
      }))
    });

  } catch (error) {
    console.error('Get pending entries error:', error);
    res.status(500).json({
      error: 'Failed to get pending entries'
    });
  }
});

// Approve time entry
router.post('/:entryId/approve', authenticateToken, requirePermission('timeEntries', 'approve'), async (req, res) => {
  try {
    const { entryId } = req.params;
    const { notes } = req.body;

    const timeEntry = await TimeEntry.findOne({
      _id: entryId,
      companyId: req.user.companyId,
      status: 'pending'
    });

    if (!timeEntry) {
      return res.status(404).json({
        error: 'Time entry not found'
      });
    }

    await timeEntry.approve(req.user.userId, notes);

    res.json({
      message: 'Time entry approved successfully'
    });

  } catch (error) {
    console.error('Approve time entry error:', error);
    res.status(500).json({
      error: 'Failed to approve time entry'
    });
  }
});

module.exports = router;