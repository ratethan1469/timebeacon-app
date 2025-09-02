const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Company = require('../../models/Company');
const Subscription = require('../../models/Subscription');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Company signup (creates company + owner account)
router.post('/signup', async (req, res) => {
  try {
    const {
      companyName,
      companySlug,
      companyEmail,
      companyDomain,
      ownerEmail,
      ownerPassword,
      ownerFirstName,
      ownerLastName,
      plan = 'starter',
      billingInterval = 'monthly'
    } = req.body;

    // Validation
    const required = ['companyName', 'companySlug', 'companyEmail', 'ownerEmail', 'ownerPassword', 'ownerFirstName', 'ownerLastName'];
    const missing = required.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        required,
        missing
      });
    }

    // Check if company slug already exists
    const existingCompany = await Company.findOne({
      $or: [
        { slug: companySlug.toLowerCase() },
        { email: companyEmail.toLowerCase() }
      ]
    });
    if (existingCompany) {
      return res.status(400).json({
        error: 'Company already exists',
        message: 'Company slug or email already registered'
      });
    }

    // Check if owner email already exists
    const existingUser = await User.findOne({ email: ownerEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'Owner email address is already registered'
      });
    }

    // Get plan pricing
    const planPricing = Subscription.schema.statics.getPlanPricing();
    const selectedPlan = planPricing[plan];
    if (!selectedPlan) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'Selected plan does not exist',
        availablePlans: Object.keys(planPricing)
      });
    }

    // Create company
    const company = new Company({
      name: companyName,
      slug: companySlug.toLowerCase(),
      email: companyEmail.toLowerCase(),
      domain: companyDomain ? companyDomain.toLowerCase() : null,
      subscription: {
        plan: plan,
        status: 'trial',
        maxUsers: selectedPlan.limits.users,
        features: selectedPlan.features
      },
      settings: {
        aiControlDefaults: {
          companyDomain: companyDomain ? companyDomain.toLowerCase() : null
        }
      }
    });

    await company.save();

    // Create subscription record
    const subscription = new Subscription({
      companyId: company._id,
      plan: plan,
      status: 'trial',
      billing: {
        interval: billingInterval,
        amount: selectedPlan[billingInterval],
        currency: 'USD'
      },
      limits: selectedPlan.limits,
      features: selectedPlan.features
    });

    // Start 14-day trial
    subscription.startTrial(14);
    await subscription.save();

    // Create owner user
    const owner = new User({
      companyId: company._id,
      email: ownerEmail.toLowerCase(),
      password: ownerPassword,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      role: 'owner',
      isEmailVerified: false // Will need email verification in production
    });

    await owner.save();

    // Update subscription usage
    subscription.usage.activeUsers = 1;
    await subscription.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: owner._id,
        companyId: company._id,
        role: 'owner'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Company and owner account created successfully',
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        domain: company.domain,
        subscription: company.subscription,
        trialEndsAt: subscription.trial.endDate
      },
      user: {
        id: owner._id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: owner.role,
        companyId: company._id,
        companyName: company.name,
        companySlug: company.slug
      },
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        trialActive: subscription.trial.isActive,
        trialEndsAt: subscription.trial.endDate,
        limits: subscription.limits,
        features: subscription.features
      },
      token
    });

  } catch (error) {
    console.error('Company signup error:', error);
    res.status(500).json({
      error: 'Company signup failed',
      message: error.message
    });
  }
});

// Register new user (admin only or during company setup)
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      companySlug,
      role = 'employee'
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !companySlug) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName', 'companySlug']
      });
    }

    // Find company
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      return res.status(404).json({
        error: 'Company not found',
        message: 'Invalid company slug'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'Email address is already registered'
      });
    }

    // Check company user limit
    const userCount = await User.countDocuments({ 
      companyId: company._id, 
      isActive: true 
    });
    
    if (userCount >= company.subscription.maxUsers) {
      return res.status(400).json({
        error: 'User limit exceeded',
        message: `Company has reached maximum users (${company.subscription.maxUsers})`
      });
    }

    // Create new user
    const user = new User({
      companyId: company._id,
      email,
      password,
      firstName,
      lastName,
      role,
      isEmailVerified: true // Skip email verification for now
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        companyId: company._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: company._id,
        companyName: company.name,
        companySlug: company.slug
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, companySlug } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email, isActive: true })
      .populate('companyId', 'name slug subscription settings isActive');
      
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // If company slug provided, verify user belongs to that company
    if (companySlug && user.companyId.slug !== companySlug) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User does not belong to specified company'
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if company is active and subscription status
    if (!user.companyId.isActive) {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Company account is not active'
      });
    }

    // Get subscription details
    const subscription = await Subscription.findOne({ companyId: user.companyId._id });
    const validStatuses = ['active', 'trial'];
    
    if (subscription && !validStatuses.includes(subscription.status)) {
      return res.status(403).json({
        error: 'Subscription inactive',
        message: 'Company subscription is not active. Please update your billing.',
        subscription: {
          status: subscription.status,
          plan: subscription.plan
        }
      });
    }

    // Check if trial is expired
    if (subscription && subscription.isTrialExpired()) {
      return res.status(403).json({
        error: 'Trial expired',
        message: 'Your free trial has expired. Please upgrade to continue.',
        subscription: {
          status: 'expired',
          plan: subscription.plan,
          trialEndedAt: subscription.trial.endDate
        }
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        profile: user.profile,
        settings: user.settings,
        companyId: user.companyId._id,
        companyName: user.companyId.name,
        companySlug: user.companyId.slug,
        companySettings: user.companyId.settings,
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          trialActive: subscription.trial.isActive,
          trialEndsAt: subscription.trial.endDate,
          limits: subscription.limits,
          features: subscription.features,
          usage: subscription.usage
        } : user.companyId.subscription,
        lastLogin: user.lastLogin
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('companyId', 'name slug subscription settings')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
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
        companyId: user.companyId._id,
        companyName: user.companyId.name,
        companySlug: user.companyId.slug,
        companySettings: user.companyId.settings,
        subscription: user.companyId.subscription,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('companyId', 'name slug subscription');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Generate new token
    const token = jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Token refreshed',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

// Get available subscription plans
router.get('/plans', (req, res) => {
  try {
    const plans = Subscription.schema.statics.getPlanPricing();
    res.json({
      plans,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      error: 'Failed to get plans',
      message: error.message
    });
  }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Could add token blacklisting here if needed
    // For now, just confirm logout
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
});

module.exports = router;