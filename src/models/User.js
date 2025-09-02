const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'employee', 'viewer'],
    default: 'employee'
  },
  permissions: {
    timeEntries: {
      create: { type: Boolean, default: true },
      read: { type: String, enum: ['own', 'team', 'all'], default: 'own' },
      update: { type: String, enum: ['own', 'team', 'all'], default: 'own' },
      delete: { type: String, enum: ['own', 'team', 'all'], default: 'own' },
      approve: { type: Boolean, default: false }
    },
    projects: {
      create: { type: Boolean, default: false },
      read: { type: String, enum: ['assigned', 'all'], default: 'assigned' },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    clients: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      view: { type: String, enum: ['own', 'team', 'all'], default: 'own' },
      export: { type: Boolean, default: false }
    },
    users: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    aiControl: {
      configure: { type: Boolean, default: false },
      viewSettings: { type: Boolean, default: true }
    }
  },
  profile: {
    avatar: String,
    phone: String,
    timezone: { type: String, default: 'UTC' },
    hourlyRate: Number,
    department: String,
    title: String,
    startDate: Date
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true },
      timeReminders: { type: Boolean, default: true }
    },
    preferences: {
      defaultProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '17:00' },
        days: { type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
      }
    },
    aiControl: {
      confidenceThreshold: { type: Number, default: 0.80 },
      descriptionLength: { type: String, enum: ['brief', 'standard', 'detailed'], default: 'standard' },
      autoApprove: { type: Boolean, default: false },
      gmailDomainFilter: {
        enabled: { type: Boolean, default: true },
        companyDomain: { type: String, default: '' },
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
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Indexes for performance (indexes also created in database.js)
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Set permissions based on role
userSchema.methods.setRolePermissions = function() {
  const rolePermissions = {
    owner: {
      timeEntries: { create: true, read: 'all', update: 'all', delete: 'all', approve: true },
      projects: { create: true, read: 'all', update: true, delete: true },
      clients: { create: true, read: true, update: true, delete: true },
      reports: { view: 'all', export: true },
      users: { create: true, read: true, update: true, delete: true },
      aiControl: { configure: true, viewSettings: true }
    },
    admin: {
      timeEntries: { create: true, read: 'all', update: 'all', delete: 'all', approve: true },
      projects: { create: true, read: 'all', update: true, delete: true },
      clients: { create: true, read: true, update: true, delete: true },
      reports: { view: 'all', export: true },
      users: { create: true, read: true, update: true, delete: false },
      aiControl: { configure: true, viewSettings: true }
    },
    manager: {
      timeEntries: { create: true, read: 'team', update: 'team', delete: 'own', approve: true },
      projects: { create: true, read: 'all', update: true, delete: false },
      clients: { create: false, read: true, update: false, delete: false },
      reports: { view: 'team', export: true },
      users: { create: false, read: true, update: false, delete: false },
      aiControl: { configure: false, viewSettings: true }
    },
    employee: {
      timeEntries: { create: true, read: 'own', update: 'own', delete: 'own', approve: false },
      projects: { create: false, read: 'assigned', update: false, delete: false },
      clients: { create: false, read: true, update: false, delete: false },
      reports: { view: 'own', export: false },
      users: { create: false, read: false, update: false, delete: false },
      aiControl: { configure: false, viewSettings: true }
    },
    viewer: {
      timeEntries: { create: false, read: 'own', update: false, delete: false, approve: false },
      projects: { create: false, read: 'assigned', update: false, delete: false },
      clients: { create: false, read: true, update: false, delete: false },
      reports: { view: 'own', export: false },
      users: { create: false, read: false, update: false, delete: false },
      aiControl: { configure: false, viewSettings: false }
    }
  };

  this.permissions = rolePermissions[this.role] || rolePermissions.employee;
};

// Set role permissions before saving
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    this.setRolePermissions();
  }
  next();
});

module.exports = mongoose.model('User', userSchema);