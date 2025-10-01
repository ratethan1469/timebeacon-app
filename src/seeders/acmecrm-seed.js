const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const User = require('../models/User');
const connectDB = require('../config/database');

const seedACMECRM = async () => {
  try {
    console.log('🚀 Starting ACMEcrm seed process...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing ACMEcrm data (optional - remove in production)
    await Company.deleteOne({ slug: 'acmecrm' });
    await User.deleteMany({ 'companyId': { $exists: true } });
    
    // Create ACMEcrm Company
    console.log('📊 Creating ACMEcrm company...');
    const acmeCompany = new Company({
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
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
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
    });
    
    await acmeCompany.save();
    console.log('✅ ACMEcrm company created successfully');
    
    // Create 5 employees for ACMEcrm
    console.log('👥 Creating ACMEcrm employees...');
    
    const employees = [
      // Manager
      {
        email: 'sarah.manager@acmecrm.com',
        password: 'TempPass123!',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'manager',
        profile: {
          phone: '+1-555-0101',
          timezone: 'America/New_York',
          hourlyRate: 85,
          department: 'Operations',
          title: 'Operations Manager',
          startDate: new Date('2023-01-15')
        }
      },
      // Employees
      {
        email: 'mike.developer@acmecrm.com',
        password: 'TempPass123!',
        firstName: 'Mike',
        lastName: 'Chen',
        role: 'employee',
        profile: {
          phone: '+1-555-0102',
          timezone: 'America/Los_Angeles',
          hourlyRate: 75,
          department: 'Engineering',
          title: 'Senior Developer',
          startDate: new Date('2023-02-01')
        }
      },
      {
        email: 'lisa.sales@acmecrm.com',
        password: 'TempPass123!',
        firstName: 'Lisa',
        lastName: 'Rodriguez',
        role: 'employee',
        profile: {
          phone: '+1-555-0103',
          timezone: 'America/Chicago',
          hourlyRate: 65,
          department: 'Sales',
          title: 'Sales Representative',
          startDate: new Date('2023-03-10')
        }
      },
      {
        email: 'david.support@acmecrm.com',
        password: 'TempPass123!',
        firstName: 'David',
        lastName: 'Thompson',
        role: 'employee',
        profile: {
          phone: '+1-555-0104',
          timezone: 'America/New_York',
          hourlyRate: 55,
          department: 'Customer Support',
          title: 'Support Specialist',
          startDate: new Date('2023-04-05')
        }
      },
      {
        email: 'anna.designer@acmecrm.com',
        password: 'TempPass123!',
        firstName: 'Anna',
        lastName: 'Kim',
        role: 'employee',
        profile: {
          phone: '+1-555-0105',
          timezone: 'America/Los_Angeles',
          hourlyRate: 70,
          department: 'Design',
          title: 'UI/UX Designer',
          startDate: new Date('2023-05-20')
        }
      }
    ];
    
    const createdUsers = [];
    
    for (const employeeData of employees) {
      const user = new User({
        companyId: acmeCompany._id,
        ...employeeData,
        isActive: true,
        isEmailVerified: true
      });
      
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.role})`);
    }
    
    console.log('\n🎉 ACMEcrm seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`Company: ${acmeCompany.name}`);
    console.log(`Company Slug: ${acmeCompany.slug}`);
    console.log(`Total Users: ${createdUsers.length}`);
    console.log(`Managers: ${createdUsers.filter(u => u.role === 'manager').length}`);
    console.log(`Employees: ${createdUsers.filter(u => u.role === 'employee').length}`);
    
    console.log('\n🔐 Login Credentials:');
    createdUsers.forEach(user => {
      console.log(`${user.firstName} ${user.lastName} (${user.role}): ${user.email} / TempPass123!`);
    });
    
    console.log('\n📊 Company Features:');
    console.log('✅ AI Control Center');
    console.log('✅ Advanced Reports');
    console.log('✅ Integrations (Gmail, Slack, Calendar)');
    console.log('✅ Team Management');
    console.log('✅ Multi-tenant Architecture');
    
    console.log('\n🎯 AI Control Defaults:');
    console.log(`Confidence Threshold: ${acmeCompany.settings.aiControlDefaults.confidenceThreshold * 100}%`);
    console.log(`Description Length: ${acmeCompany.settings.aiControlDefaults.descriptionLength}`);
    console.log(`Auto-Approve: ${acmeCompany.settings.aiControlDefaults.autoApprove ? 'Yes' : 'No'}`);
    console.log(`Data Retention: ${acmeCompany.settings.aiControlDefaults.retentionPolicy.keepStructuredDataDays} days`);
    
  } catch (error) {
    console.error('❌ Error seeding ACMEcrm:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
if (require.main === module) {
  seedACMECRM();
}

module.exports = seedACMECRM;