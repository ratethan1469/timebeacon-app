const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Company = require('./src/models/Company');
const Subscription = require('./src/models/Subscription');

// Customer data - replace with real info
const customerData = {
  company: {
    name: "First Customer Corp",
    slug: "first-customer",
    email: "admin@firstcustomer.com",
    domain: "firstcustomer.com"
  },
  owner: {
    email: "owner@firstcustomer.com",
    password: "password123",
    firstName: "John",
    lastName: "Owner"
  },
  employees: [
    { email: "manager@firstcustomer.com", password: "password123", firstName: "Jane", lastName: "Manager", role: "manager" },
    { email: "employee1@firstcustomer.com", password: "password123", firstName: "Bob", lastName: "Employee", role: "employee" },
    { email: "employee2@firstcustomer.com", password: "password123", firstName: "Alice", lastName: "Worker", role: "employee" },
    { email: "employee3@firstcustomer.com", password: "password123", firstName: "Mike", lastName: "Staff", role: "employee" },
    { email: "employee4@firstcustomer.com", password: "password123", firstName: "Sarah", lastName: "Team", role: "employee" }
  ]
};

async function setupCustomer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timebeacon');
    console.log('Connected to MongoDB');

    // 1. Create Company
    console.log('\n1. Creating company...');
    const company = new Company({
      name: customerData.company.name,
      slug: customerData.company.slug,
      email: customerData.company.email,
      domain: customerData.company.domain,
      subscription: {
        plan: 'professional', // Good plan for 6 users
        status: 'active', // Give them active status
        maxUsers: 25,
        features: {
          aiControl: true,
          advancedReports: true,
          integrations: true,
          teamManagement: true
        }
      },
      settings: {
        aiControlDefaults: {
          companyDomain: customerData.company.domain
        }
      }
    });

    await company.save();
    console.log(`✓ Company created: ${company.name} (ID: ${company._id})`);

    // 2. Create Subscription
    console.log('\n2. Creating subscription...');
    const subscription = new Subscription({
      companyId: company._id,
      plan: 'professional',
      status: 'active',
      billing: {
        interval: 'monthly',
        amount: 79,
        currency: 'USD',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      limits: {
        users: 25,
        projects: 50,
        storage: 50
      },
      features: {
        aiControl: true,
        advancedReports: true,
        integrations: true,
        teamManagement: true,
        apiAccess: true,
        customBranding: false,
        ssoIntegration: false
      },
      usage: {
        activeUsers: 6, // Owner + 5 employees
        totalProjects: 0,
        storageUsed: 0
      }
    });

    await subscription.save();
    console.log(`✓ Subscription created: ${subscription.plan} plan (ID: ${subscription._id})`);

    // 3. Create Owner
    console.log('\n3. Creating owner account...');
    const owner = new User({
      companyId: company._id,
      email: customerData.owner.email,
      password: customerData.owner.password,
      firstName: customerData.owner.firstName,
      lastName: customerData.owner.lastName,
      role: 'owner',
      isEmailVerified: true,
      isActive: true
    });

    await owner.save();
    console.log(`✓ Owner created: ${owner.firstName} ${owner.lastName} (${owner.email})`);

    // 4. Create Employees
    console.log('\n4. Creating employee accounts...');
    for (let i = 0; i < customerData.employees.length; i++) {
      const empData = customerData.employees[i];
      
      const employee = new User({
        companyId: company._id,
        email: empData.email,
        password: empData.password,
        firstName: empData.firstName,
        lastName: empData.lastName,
        role: empData.role,
        isEmailVerified: true,
        isActive: true
      });

      await employee.save();
      console.log(`✓ Employee ${i + 1} created: ${employee.firstName} ${employee.lastName} (${employee.email})`);
    }

    // 5. Summary
    console.log('\n🎉 CUSTOMER SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Company: ${company.name}`);
    console.log(`Company Slug: ${company.slug}`);
    console.log(`Subscription: ${subscription.plan} (${subscription.status})`);
    console.log(`Users: ${6} total`);
    console.log('\nLogin Credentials:');
    console.log(`Owner: ${owner.email} / password123`);
    customerData.employees.forEach((emp, i) => {
      console.log(`Employee ${i + 1}: ${emp.email} / password123`);
    });
    console.log('\nThey can now login at: http://localhost:3000/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run setup
setupCustomer();