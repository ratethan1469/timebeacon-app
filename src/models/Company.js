const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  domain: {
    type: String,
    lowercase: true,
    trim: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      default: 'starter'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'trial', 'expired'],
      default: 'trial'
    },
    maxUsers: {
      type: Number,
      default: 5
    },
    features: {
      aiControl: { type: Boolean, default: true },
      advancedReports: { type: Boolean, default: false },
      integrations: { type: Boolean, default: true },
      teamManagement: { type: Boolean, default: true }
    }
  },
  settings: {
    timezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: '12h' },
    currency: { type: String, default: 'USD' },
    aiControlDefaults: {
      confidenceThreshold: { type: Number, default: 0.80 },
      descriptionLength: { type: String, enum: ['brief', 'standard', 'detailed'], default: 'standard' },
      autoApprove: { type: Boolean, default: false },
      gmailDomainFilter: {
        enabled: { type: Boolean, default: true },
        companyDomain: { type: String },
        excludeInternal: { type: Boolean, default: true }
      },
      slackChannelFilter: {
        enabled: { type: Boolean, default: true },
        keywords: { type: [String], default: ['client', 'project', 'meeting'] }
      },
      retentionPolicy: {
        deleteRawDataAfterProcessing: { type: Boolean, default: true },
        keepStructuredDataDays: { type: Number, default: 1 }
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance (main indexes also created in database.js)
companySchema.index({ 'subscription.status': 1 });

module.exports = mongoose.model('Company', companySchema);