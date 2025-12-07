#!/usr/bin/env node

/**
 * TimeBeacon Customer Provisioning Script
 *
 * Usage:
 *   npm run provision-customer -- --company="Acme Corp" --admin-email="john@acme.com" --admin-name="John Doe" --tier="pro"
 *
 * This script:
 * 1. Creates a new company in Supabase
 * 2. Creates a Clerk invitation for the admin user
 * 3. Outputs the invitation link to send to the customer
 */

import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!clerkSecretKey) {
  console.error('❌ Missing Clerk secret key');
  console.error('   Set CLERK_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

// Parse command line arguments
function parseArgs() {
  const params = {};
  const argString = process.argv.slice(2).join(' ');

  // Extract values using regex for --key="value" or --key=value patterns
  const patterns = {
    company: /--company[=\s]+"?([^"]+)"?/,
    adminEmail: /--admin-email[=\s]+"?([^"\s]+)"?/,
    adminName: /--admin-name[=\s]+"?([^"]+)"?/,
    tier: /--tier[=\s]+"?([^"\s]+)"?/,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = argString.match(pattern);
    if (match) {
      params[key] = match[1].trim();
    }
  }

  return params;
}

async function provisionCustomer({ company, adminEmail, adminName, tier = 'free' }) {
  console.log('\n🚀 TimeBeacon Customer Provisioning\n');
  console.log(`Company: ${company}`);
  console.log(`Admin: ${adminName} (${adminEmail})`);
  console.log(`Tier: ${tier}\n`);

  try {
    // Step 1: Create company in Supabase
    console.log('📦 Creating company in database...');

    const storageLimit = tier === 'enterprise' ? 102400 : tier === 'pro' ? 51200 : 10240;

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company,
        subscription_tier: tier,
        storage_limit_mb: storageLimit,
      })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    console.log(`✅ Company created (ID: ${companyData.id})\n`);

    // Step 2: Create Clerk invitation
    console.log('📧 Creating admin invitation in Clerk...');

    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: adminEmail,
      redirectUrl: `https://app.timebeacon.io/accept-invite/${companyData.id}`,
      publicMetadata: {
        company_id: companyData.id,
        company_name: company,
        role: 'Admin',
        is_champion: true,
      },
    });

    console.log(`✅ Invitation created\n`);

    // Step 3: Output summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ Customer Provisioned Successfully!\n');
    console.log(`Company ID: ${companyData.id}`);
    console.log(`Invitation URL: ${invitation.url}\n`);
    console.log('📋 Next Steps:');
    console.log(`   1. Send invitation link to ${adminEmail}`);
    console.log(`   2. Customer clicks link and signs up via Clerk`);
    console.log(`   3. Customer gets redirected to dashboard`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Save to file for record keeping
    const timestamp = new Date().toISOString().split('T')[0];
    const record = {
      date: timestamp,
      company: company,
      companyId: companyData.id,
      adminEmail: adminEmail,
      adminName: adminName,
      tier: tier,
      invitationUrl: invitation.url,
    };

    console.log('💾 Provisioning record:');
    console.log(JSON.stringify(record, null, 2));
    console.log('');

  } catch (error) {
    console.error('\n❌ Provisioning failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Main execution
const args = parseArgs();

if (!args.company || !args.adminEmail || !args.adminName) {
  console.error('❌ Missing required arguments\n');
  console.log('Usage:');
  console.log('  npm run provision-customer -- --company="Company Name" --admin-email="admin@company.com" --admin-name="Admin Name" [--tier="pro"]\n');
  console.log('Example:');
  console.log('  npm run provision-customer -- --company="Acme Corp" --admin-email="john@acme.com" --admin-name="John Doe" --tier="pro"\n');
  process.exit(1);
}

provisionCustomer(args);
