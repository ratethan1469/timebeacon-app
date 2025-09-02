const express = require('express');
const Company = require('../../models/Company');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get company details by slug
router.get('/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    
    const company = await Company.findOne({ slug, isActive: true })
      .select('-__v');

    if (!company) {
      return res.status(404).json({
        error: 'Company not found'
      });
    }

    // Verify user belongs to this company
    if (company._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        domain: company.domain,
        subscription: company.subscription,
        settings: company.settings,
        createdAt: company.createdAt
      }
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      error: 'Failed to get company details'
    });
  }
});

// Update company settings (admin/owner only)
router.put('/:slug/settings', authenticateToken, requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;

    const company = await Company.findOneAndUpdate(
      { slug, _id: req.user.companyId },
      { $set: { settings: updates } },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({
        error: 'Company not found'
      });
    }

    res.json({
      message: 'Company settings updated',
      settings: company.settings
    });

  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({
      error: 'Failed to update company settings'
    });
  }
});

module.exports = router;