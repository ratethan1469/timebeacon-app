/**
 * Debug OAuth Setup
 * Test if our OAuth configuration is valid
 */

require('dotenv').config({ path: './.env' });
const { google } = require('googleapis');

console.log('🔍 Debugging OAuth Configuration...\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('✅ GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
console.log('✅ GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('✅ GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || 'Missing');
console.log('');

// Test OAuth client creation
console.log('2. OAuth Client Creation:');
try {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    console.log('✅ OAuth2 client created successfully');
    
    // Test auth URL generation
    const SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
    
    console.log('✅ Auth URL generated successfully');
    console.log('📋 Auth URL preview:', authUrl.substring(0, 100) + '...');
    
} catch (error) {
    console.log('❌ OAuth client creation failed:', error.message);
}

console.log('');

// Test with a sample authorization code (this will fail but shows the request format)
console.log('3. Testing Token Exchange Format:');

const testCode = '4/0AVGzR1C9sMOZ-RwaPGO6J_IXkgsQUIZkNVlw9wdP_9VnpZHtbA5zWK25fM1I-Y-6ATTAYA';

async function testTokenExchange() {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        console.log('🔄 Attempting token exchange...');
        const { tokens } = await oauth2Client.getToken(testCode);
        console.log('✅ Token exchange successful!');
        
    } catch (error) {
        console.log('❌ Token exchange failed (expected):');
        console.log('   Error:', error.message);
        
        if (error.message.includes('invalid_client')) {
            console.log('');
            console.log('🔧 POTENTIAL FIXES:');
            console.log('1. Verify in Google Cloud Console:');
            console.log('   - Client ID matches:', process.env.GOOGLE_CLIENT_ID);
            console.log('   - Redirect URI exactly matches:', process.env.GOOGLE_REDIRECT_URI);
            console.log('   - OAuth consent screen is published (not in testing)');
            console.log('');
            console.log('2. Check OAuth Client Type:');
            console.log('   - Should be "Web application" not "Desktop" or "Mobile"');
            console.log('');
            console.log('3. Verify Project Status:');
            console.log('   - Project exists and is not suspended');
            console.log('   - APIs (Gmail, Calendar, Drive) are enabled');
            console.log('');
            console.log('4. Check for Multiple Projects:');
            console.log('   - Make sure you\'re editing the right OAuth client');
            console.log('   - Client ID should exist in the same project as enabled APIs');
        }
        
        if (error.message.includes('invalid_grant')) {
            console.log('   Note: Authorization code can only be used once');
        }
    }
}

testTokenExchange();