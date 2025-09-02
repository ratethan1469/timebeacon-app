const express = require('express');
const User = require('../../models/User');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all users in company
router.get('/', authenticateToken, requirePermission('users', 'read'), async (req, res) => {
  try {
    const users = await User.find({ 
      companyId: req.user.companyId,
      isActive: true 
    })
    .select('-password -__v')
    .sort({ firstName: 1 });

    res.json({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile: user.profile,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }))
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users'
    });
  }
});

// Get user by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can view their own profile, managers can view team members
    const user = await User.findOne({
      _id: userId,
      companyId: req.user.companyId,
      isActive: true
    }).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check permissions
    if (userId !== req.user.userId && !['owner', 'admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        profile: user.profile,
        settings: user.settings,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user'
    });
  }
});

// Update user profile
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Users can update their own profile, admins can update others
    if (userId !== req.user.userId && !['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Don't allow role changes unless admin/owner
    if (updates.role && !['owner', 'admin'].includes(req.user.role)) {
      delete updates.role;
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, companyId: req.user.companyId },
      { $set: updates },
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile: user.profile,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
});

module.exports = router;