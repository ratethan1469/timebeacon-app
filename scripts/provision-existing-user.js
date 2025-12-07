#!/usr/bin/env node

/**
 * Provision company for EXISTING Clerk user
 * Use this when the admin already has a Clerk account
 *
 * Usage: node scripts/provision-existing-user.js "Company Name" "clerk_user_id" "tier"
 * Example: node scripts/provision-existing-user.js "Acme Corp" "user_35M8k60keg5vTK5DAKyOrIxTaK7" "pro"
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function provision(companyName, clerkUserId, tier = 'free') {
  console.log('\n🚀 Provisioning Company for Existing User\n');
  console.log(`Company: ${companyName}`);
  console.log(`Clerk User ID: ${clerkUserId}`);
  console.log(`Tier: ${tier}\n`);

  try {
    // Step 1: Create company
    console.log('📦 Creating company...');
    const storageLimit = { enterprise: 102400, pro: 51200, free: 10240 }[tier] || 10240;

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        subscription_tier: tier,
        storage_limit_mb: storageLimit
      })
      .select()
      .single();

    if (companyError) throw companyError;
    console.log(`✅ Company created (${company.id})\n`);

    // Step 2: Check if user profile already exists
    console.log('🔍 Checking for existing user profile...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', clerkUserId)
      .single();

    if (existingUser) {
      // Update existing user to point to new company
      console.log('📝 Updating user profile...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          company_id: company.id,
          role: 'Admin'
        })
        .eq('id', clerkUserId);

      if (updateError) throw updateError;
    } else {
      // Create new user profile
      console.log('📝 Creating user profile...');
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: clerkUserId,
          email: 'placeholder@example.com', // Will be updated on first login
          full_name: 'Admin User',
          company_id: company.id,
          role: 'Admin',
        });

      if (insertError) throw insertError;
    }

    console.log('✅ User profile updated\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ PROVISIONED SUCCESSFULLY\n');
    console.log(`Company ID: ${company.id}`);
    console.log(`Dashboard: https://app.timebeacon.io/${company.id}/${clerkUserId}/dashboard`);
    console.log('\nUser can log in at app.timebeacon.io immediately.');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

const [companyName, clerkUserId, tier] = process.argv.slice(2);

if (!companyName || !clerkUserId) {
  console.error('❌ Usage: node scripts/provision-existing-user.js "Company Name" "clerk_user_id" [tier]');
  console.error('\nExample: node scripts/provision-existing-user.js "Acme Corp" "user_35M8k60keg5vTK5DAKyOrIxTaK7" "pro"');
  process.exit(1);
}

provision(companyName, clerkUserId, tier);
