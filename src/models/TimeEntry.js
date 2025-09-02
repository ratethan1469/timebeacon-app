const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // minutes
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'submitted'],
    default: 'pending'
  },
  isBillable: {
    type: Boolean,
    default: true
  },
  hourlyRate: Number,
  tags: [String],
  
  // AI-generated fields
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiSource: {
    type: String,
    enum: ['gmail', 'calendar', 'slack', 'zoom', 'manual'],
    default: 'manual'
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  aiSummary: String,
  originalContent: {
    subject: String,
    participants: [String],
    location: String,
    meetingId: String,
    emailId: String,
    messageId: String
  },
  
  // Review and approval
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  
  // Modification tracking
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modificationHistory: [{
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date, default: Date.now },
    changes: mongoose.Schema.Types.Mixed,
    reason: String
  }],
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
timeEntrySchema.index({ companyId: 1, userId: 1, date: -1 });
timeEntrySchema.index({ companyId: 1, projectId: 1, date: -1 });
timeEntrySchema.index({ companyId: 1, clientId: 1, date: -1 });
timeEntrySchema.index({ companyId: 1, status: 1 });
timeEntrySchema.index({ companyId: 1, aiGenerated: 1, aiSource: 1 });
timeEntrySchema.index({ date: -1 });
timeEntrySchema.index({ startTime: 1, endTime: 1 });

// Virtual for total billable amount
timeEntrySchema.virtual('billableAmount').get(function() {
  if (!this.isBillable || !this.hourlyRate) return 0;
  return (this.duration / 60) * this.hourlyRate;
});

// Calculate duration before saving
timeEntrySchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // minutes
  }
  next();
});

// Static method to get user's time entries for a date range
timeEntrySchema.statics.getTimeEntriesForUser = function(companyId, userId, startDate, endDate) {
  return this.find({
    companyId,
    userId,
    date: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  })
  .populate('projectId', 'name color')
  .populate('clientId', 'name color')
  .sort({ date: -1, startTime: -1 });
};

// Static method to get entries requiring review
timeEntrySchema.statics.getEntriesForReview = function(companyId, managerId = null) {
  const query = {
    companyId,
    status: 'pending',
    aiGenerated: true,
    isActive: true
  };

  if (managerId) {
    // If manager specified, only show their team's entries
    // This would need additional logic to determine team membership
    query.reviewedBy = { $exists: false };
  }

  return this.find(query)
    .populate('userId', 'firstName lastName email')
    .populate('projectId', 'name color')
    .populate('clientId', 'name color')
    .sort({ createdAt: -1 });
};

// Instance method to approve entry
timeEntrySchema.methods.approve = function(reviewerId, notes = '') {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

// Instance method to reject entry
timeEntrySchema.methods.reject = function(reviewerId, notes = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);