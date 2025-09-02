const express = require('express');
const Company = require('../../models/Company');
const User = require('../../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get AI Control Center settings (per-user)
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if user has permission to view AI Control settings
    if (!user.permissions?.aiControl?.viewSettings) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view AI Control settings'
      });
    }

    res.json({
      settings: user.settings.aiControl,
      canConfigure: true, // Users can configure their own settings
      userRole: user.role
    });

  } catch (error) {
    console.error('Get AI Control settings error:', error);
    res.status(500).json({
      error: 'Failed to get AI Control settings'
    });
  }
});

// Update AI Control Center settings (per-user)
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate settings
    if (updates.confidenceThreshold && (updates.confidenceThreshold < 0.5 || updates.confidenceThreshold > 0.95)) {
      return res.status(400).json({
        error: 'Invalid confidence threshold',
        message: 'Confidence threshold must be between 0.5 and 0.95'
      });
    }

    if (updates.descriptionLength && !['brief', 'standard', 'detailed'].includes(updates.descriptionLength)) {
      return res.status(400).json({
        error: 'Invalid description length',
        message: 'Description length must be brief, standard, or detailed'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        $set: { 
          'settings.aiControl': {
            ...updates,
            updatedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'AI Control settings updated successfully',
      settings: user.settings.aiControl
    });

  } catch (error) {
    console.error('Update AI Control settings error:', error);
    res.status(500).json({
      error: 'Failed to update AI Control settings'
    });
  }
});

// Get AI processing status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user?.permissions?.aiControl?.viewSettings) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // This would connect to your AI processing service
    // For now, return mock status
    res.json({
      status: 'active',
      processing: {
        emailsProcessed: 0,
        slackMessagesProcessed: 0,
        calendarEventsProcessed: 0,
        averageConfidence: 0,
        lastProcessed: null
      },
      engine: {
        available: true,
        model: 'llama3.2:3b',
        version: '1.0.0'
      },
      retention: {
        rawDataDeleted: true,
        structuredDataRetentionDays: 1
      }
    });

  } catch (error) {
    console.error('Get AI status error:', error);
    res.status(500).json({
      error: 'Failed to get AI status'
    });
  }
});

// Test AI processing
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user?.permissions?.aiControl?.configure) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Mock AI test - in production this would test your AI service
    const testResult = {
      success: true,
      latency: Math.floor(Math.random() * 1000) + 200,
      confidence: 0.85,
      testData: {
        input: 'Test email about client meeting',
        output: {
          activity: 'Client Meeting Discussion',
          description: 'Email discussion about upcoming client meeting and agenda preparation',
          confidence: 0.85,
          source: 'gmail'
        }
      },
      timestamp: new Date()
    };

    res.json({
      message: 'AI test completed successfully',
      result: testResult
    });

  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      error: 'Failed to test AI processing'
    });
  }
});

module.exports = router;