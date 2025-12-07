#!/usr/bin/env node

/**
 * TimeBeacon Customer Provisioning Script v2
 *
 * Usage:
 *   node scripts/provision-customer-v2.js "Company Name" admin@email.com "Admin Name" [tier]
 *
 * Example:
 *   node scripts/provision-customer-v2.js "Acme Corp" john@acme.com "John Doe" pro
 */

import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !clerkSecretKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const clerkClient = createClerkClient({ secretKey: clerkSecretKey });

async function provision(companyName, adminEmail, adminName, tier = 'free') {
  console.log('\n🚀 TimeBeacon Customer Provisioning\n');
  console.log(`Company: ${companyName}`);
  console.log(`Admin: ${adminName} (${adminEmail})`);
  console.log(`Tier: ${tier}\n`);

  try {
    // Step 1: Create company
    console.log('📦 Creating company...');
    const storageLimit = { enterprise: 102400, pro: 51200, free: 10240 }[tier] || 10240;

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName, subscription_tier: tier, storage_limit_mb: storageLimit })
      .select()
      .single();

    if (companyError) throw companyError;
    console.log(`✅ Company created (${company.id})\n`);

    // Step 2: Check if user exists
    console.log('🔍 Checking for existing user...');
    let users;
    try {
      users = await clerkClient.users.getUserList({ emailAddress: [adminEmail] });
    } catch (err) {
      console.log(`⚠️  Could not check for existing user: ${err.message}`);
      users = { data: [] };
    }

    if (users && users.data && users.data.length > 0) {
      // Existing user
      const clerkUser = users.data[0];
      console.log(`✅ User exists (${clerkUser.id})\n`);

      console.log('📝 Creating user profile...');
      await supabase.from('users').insert({
        id: clerkUser.id,
        email: adminEmail,
        full_name: adminName,
        company_id: company.id,
        role: 'Admin',
      });

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ PROVISIONED (Existing User)\n');
      console.log(`Dashboard: https://app.timebeacon.io/${company.id}/${clerkUser.id}/dashboard`);
      console.log(`\nUser ${adminEmail} can log in immediately.`);
      console.log('═══════════════════════════════════════════════════════\n');
    } else {
      // New user - create invitation
      console.log('📧 Creating invitation...');
      try {
        const invitation = await clerkClient.invitations.createInvitation({
          emailAddress: adminEmail,
          redirectUrl: `https://app.timebeacon.io/accept-invite/${company.id}`,
          publicMetadata: { company_id: company.id, role: 'Admin' },
        });

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ PROVISIONED (New User)\n');
        console.log(`Invitation: ${invitation.url}`);
        console.log(`\nSend this link to ${adminEmail}`);
        console.log('═══════════════════════════════════════════════════════\n');
      } catch (inviteError) {
        if (inviteError.errors && inviteError.errors[0]?.code === 'form_identifier_exists') {
          console.log('⚠️  Email exists in Clerk but query failed\n');
          console.log('📝 Finding user and creating profile...\n');

          // Get all users and find by email
          const allUsers = await clerkClient.users.getUserList();
          const foundUser = allUsers.data.find(u => u.emailAddresses.some(e => e.emailAddress === adminEmail));

          if (foundUser) {
            await supabase.from('users').insert({
              id: foundUser.id,
              email: adminEmail,
              full_name: adminName,
              company_id: company.id,
              role: 'Admin',
            });

            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ PROVISIONED (Existing User - Found)\n');
            console.log(`Dashboard: https://app.timebeacon.io/${company.id}/${foundUser.id}/dashboard`);
            console.log(`\nUser ${adminEmail} can log in immediately.`);
            console.log('═══════════════════════════════════════════════════════\n');
          } else {
            throw new Error('User exists but could not be found');
          }
        } else {
          throw inviteError;
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

// Parse simple positional arguments
const [companyName, adminEmail, adminName, tier] = process.argv.slice(2);

if (!companyName || !adminEmail || !adminName) {
  console.error('❌ Usage: node scripts/provision-customer-v2.js "Company Name" admin@email.com "Admin Name" [tier]');
  process.exit(1);
}

provision(companyName, adminEmail, adminName, tier);
