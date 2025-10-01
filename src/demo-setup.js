#!/usr/bin/env node

/**
 * TimeBeacon Demo Setup for ACMEcrm
 * 
 * This script demonstrates the MongoDB setup for your new customer ACMEcrm
 * with 5 employees (1 manager) and proper multi-tenant architecture.
 * 
 * To use this with a real MongoDB database:
 * 1. Sign up for MongoDB Atlas (free): https://cloud.mongodb.com
 * 2. Create a cluster and get your connection string
 * 3. Update MONGODB_URI in .env file
 * 4. Run: node src/demo-setup.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Company = require('./models/Company');
const User = require('./models/User');

console.log('🎯 TimeBeacon Database Demo Setup');
console.log('=' .repeat(50));

async function demoSetup() {
  try {
    console.log('📊 Setting up demo data structure...\n');
    
    // Demo company data
    const acmeCompany = {
      name: 'ACME CRM Solutions',
      slug: 'acmecrm',
      email: 'admin@acmecrm.com',
      domain: 'acmecrm.com',
      subscription: {
        plan: 'professional',
        status: 'active',
        maxUsers: 10,
        features: {
          aiControl: true,
          advancedReports: true,
          integrations: true,
          teamManagement: true
        }
      },
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        aiControlDefaults: {
          confidenceThreshold: 0.75,
          descriptionLength: 'standard',
          autoApprove: false,
          gmailDomainFilter: {
            enabled: true,
            companyDomain: '@acmecrm.com',
            excludeInternal: true
          },
          slackChannelFilter: {
            enabled: true,
            keywords: ['client', 'project', 'meeting', 'support', 'sales']
          },
          retentionPolicy: {
            deleteRawDataAfterProcessing: true,
            keepStructuredDataDays: 1
          }
        }
      }
    };

    // Demo employees
    const employees = [
      {
        email: 'sarah.manager@acmecrm.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'manager',
        profile: {
          timezone: 'America/New_York',
          hourlyRate: 85,
          department: 'Operations',
          title: 'Operations Manager'
        }
      },
      {
        email: 'mike.developer@acmecrm.com',
        firstName: 'Mike',
        lastName: 'Chen',
        role: 'employee',
        profile: {
          timezone: 'America/Los_Angeles',
          hourlyRate: 75,
          department: 'Engineering',
          title: 'Senior Developer'
        }
      },
      {
        email: 'lisa.sales@acmecrm.com',
        firstName: 'Lisa',
        lastName: 'Rodriguez',
        role: 'employee',
        profile: {
          timezone: 'America/Chicago',
          hourlyRate: 65,
          department: 'Sales',
          title: 'Sales Representative'
        }
      },
      {
        email: 'david.support@acmecrm.com',
        firstName: 'David',
        lastName: 'Thompson',
        role: 'employee',
        profile: {
          timezone: 'America/New_York',
          hourlyRate: 55,
          department: 'Customer Support',
          title: 'Support Specialist'
        }
      },
      {
        email: 'anna.designer@acmecrm.com',
        firstName: 'Anna',
        lastName: 'Kim',
        role: 'employee',
        profile: {
          timezone: 'America/Los_Angeles',
          hourlyRate: 70,
          department: 'Design',
          title: 'UI/UX Designer'
        }
      }
    ];

    console.log('🏢 Company: ACMEcrm');
    console.log(`   └─ Users: ${employees.length}`);
    console.log(`   └─ Manager: ${employees.filter(e => e.role === 'manager').length}`);
    console.log(`   └─ Employees: ${employees.filter(e => e.role === 'employee').length}`);
    console.log(`   └─ Plan: ${acmeCompany.subscription.plan}`);
    console.log(`   └─ Features: AI Control, Reports, Integrations, Team Management`);
    
    console.log('\n👥 Team Members:');
    employees.forEach((emp, i) => {
      console.log(`   ${i + 1}. ${emp.firstName} ${emp.lastName} (${emp.role})`);
      console.log(`      └─ ${emp.profile.title} | ${emp.profile.department}`);
      console.log(`      └─ ${emp.email}`);
      console.log(`      └─ $${emp.profile.hourlyRate}/hr | ${emp.profile.timezone}`);
    });

    console.log('\n🎯 AI Control Center Defaults:');
    const ai = acmeCompany.settings.aiControlDefaults;
    console.log(`   └─ Confidence Threshold: ${ai.confidenceThreshold * 100}%`);
    console.log(`   └─ Description Style: ${ai.descriptionLength}`);
    console.log(`   └─ Auto-Approve: ${ai.autoApprove ? 'Yes' : 'No'}`);
    console.log(`   └─ Gmail Filter: ${ai.gmailDomainFilter.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   └─ Slack Keywords: ${ai.slackChannelFilter.keywords.join(', ')}`);
    console.log(`   └─ Data Retention: ${ai.retentionPolicy.keepStructuredDataDays} days`);

    console.log('\n📊 Database Schema:');
    console.log('   ├─ companies (multi-tenant isolation)');
    console.log('   ├─ users (role-based permissions)');
    console.log('   ├─ timeentries (AI-enhanced time tracking)');
    console.log('   ├─ projects (client work organization)');
    console.log('   └─ aiprocessinglogs (audit trail)');

    console.log('\n🔐 Role Permissions:');
    console.log('   Manager (Sarah):');
    console.log('   ├─ Time Entries: Create, Read Team, Update Team, Approve');
    console.log('   ├─ Projects: Create, Read All, Update');
    console.log('   ├─ Reports: View Team, Export');
    console.log('   └─ AI Control: View Settings');
    console.log('   ');
    console.log('   Employees (Mike, Lisa, David, Anna):');
    console.log('   ├─ Time Entries: Create, Read Own, Update Own');
    console.log('   ├─ Projects: Read Assigned');
    console.log('   ├─ Reports: View Own');
    console.log('   └─ AI Control: View Settings');

    console.log('\n🚀 Next Steps:');
    console.log('1. Set up MongoDB Atlas account (free tier available)');
    console.log('2. Update MONGODB_URI in .env file');
    console.log('3. Run seed script: node src/seeders/acmecrm-seed.js');
    console.log('4. Start API server: node src/server/server.js');
    console.log('5. Update frontend to use API endpoints');

    console.log('\n📝 API Endpoints Available:');
    console.log('   POST /api/auth/login - User authentication');
    console.log('   GET  /api/auth/me - Get user profile');
    console.log('   GET  /api/companies/:slug - Company details');
    console.log('   GET  /api/users - List company users');
    console.log('   POST /api/time-entries - Create time entry');
    console.log('   GET  /api/ai-control/settings - AI Control Center config');

    console.log('\n🎉 Demo setup complete!');
    console.log('Your legitimate database structure is ready for ACMEcrm.');

  } catch (error) {
    console.error('❌ Demo setup error:', error.message);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  demoSetup();
}

module.exports = demoSetup;