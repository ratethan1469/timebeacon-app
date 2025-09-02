const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'past_due', 'canceled', 'expired'],
    default: 'trial'
  },
  billing: {
    interval: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    nextBillingDate: Date,
    lastBillingDate: Date
  },
  limits: {
    users: {
      type: Number,
      required: true
    },
    projects: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    storage: {
      type: Number, // in GB
      default: 10
    }
  },
  features: {
    aiControl: {
      type: Boolean,
      default: true
    },
    advancedReports: {
      type: Boolean,
      default: false
    },
    integrations: {
      type: Boolean,
      default: true
    },
    teamManagement: {
      type: Boolean,
      default: true
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    ssoIntegration: {
      type: Boolean,
      default: false
    }
  },
  trial: {
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  payment: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    paymentMethodId: String,
    lastPaymentStatus: {
      type: String,
      enum: ['succeeded', 'failed', 'pending', 'canceled']
    },
    lastPaymentDate: Date
  },
  usage: {
    activeUsers: {
      type: Number,
      default: 0
    },
    totalProjects: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number, // in GB
      default: 0
    },
    apiCallsThisMonth: {
      type: Number,
      default: 0
    }
  },
  history: [{
    action: {
      type: String,
      enum: ['created', 'upgraded', 'downgraded', 'canceled', 'reactivated', 'payment_failed', 'payment_succeeded']
    },
    fromPlan: String,
    toPlan: String,
    date: {
      type: Date,
      default: Date.now
    },
    reason: String,
    amount: Number
  }],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
subscriptionSchema.index({ companyId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'billing.nextBillingDate': 1 });
subscriptionSchema.index({ 'trial.endDate': 1 });

// Static method to get plan pricing
subscriptionSchema.statics.getPlanPricing = function() {
  return {
    starter: {
      monthly: 29,
      yearly: 290,
      limits: { users: 5, projects: 10, storage: 10 },
      features: {
        aiControl: true,
        advancedReports: false,
        integrations: true,
        teamManagement: true,
        apiAccess: false,
        customBranding: false,
        ssoIntegration: false
      }
    },
    professional: {
      monthly: 79,
      yearly: 790,
      limits: { users: 25, projects: 50, storage: 50 },
      features: {
        aiControl: true,
        advancedReports: true,
        integrations: true,
        teamManagement: true,
        apiAccess: true,
        customBranding: false,
        ssoIntegration: false
      }
    },
    enterprise: {
      monthly: 199,
      yearly: 1990,
      limits: { users: -1, projects: -1, storage: 200 },
      features: {
        aiControl: true,
        advancedReports: true,
        integrations: true,
        teamManagement: true,
        apiAccess: true,
        customBranding: true,
        ssoIntegration: true
      }
    }
  };
};

// Method to check if subscription allows a feature
subscriptionSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] || false;
};

// Method to check if within usage limits
subscriptionSchema.methods.withinLimits = function(limitType) {
  const limit = this.limits[limitType];
  const usage = this.usage[limitType === 'users' ? 'activeUsers' : limitType === 'projects' ? 'totalProjects' : 'storageUsed'];
  
  if (limit === -1) return true; // Unlimited
  return usage < limit;
};

// Method to add usage history
subscriptionSchema.methods.addHistory = function(action, details = {}) {
  this.history.push({
    action,
    fromPlan: details.fromPlan,
    toPlan: details.toPlan,
    reason: details.reason,
    amount: details.amount
  });
};

// Method to start trial
subscriptionSchema.methods.startTrial = function(days = 14) {
  const now = new Date();
  this.trial = {
    startDate: now,
    endDate: new Date(now.getTime() + (days * 24 * 60 * 60 * 1000)),
    isActive: true
  };
  this.status = 'trial';
  this.addHistory('created', { reason: 'Trial started' });
};

// Method to check if trial is expired
subscriptionSchema.methods.isTrialExpired = function() {
  if (!this.trial.isActive) return false;
  return new Date() > this.trial.endDate;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);