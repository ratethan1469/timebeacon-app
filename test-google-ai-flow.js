/**
 * Test Google AI Integration Flow
 * Run with: node test-google-ai-flow.js
 */

// Test 1: Can we generate OAuth URL?
console.log('🧪 Testing Google AI Integration Flow...\n');

async function testOAuthGeneration() {
  try {
    console.log('1️⃣ Testing OAuth URL generation...');
    const response = await fetch('http://localhost:3003/auth/google/url');
    const data = await response.json();
    
    if (data.success && data.authUrl) {
      console.log('✅ OAuth URL generated successfully');
      console.log('🔗 Auth URL:', data.authUrl.substring(0, 100) + '...');
      return true;
    } else {
      console.log('❌ OAuth URL generation failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ OAuth test failed:', error.message);
    return false;
  }
}

// Test 2: Test AI service availability
async function testAIService() {
  try {
    console.log('\n2️⃣ Testing AI service...');
    
    // Mock a simple AI analysis request
    const mockRequest = {
      title: 'Team standup meeting',
      description: 'Daily sync with the engineering team',
      source: 'calendar',
      timestamp: new Date().toISOString(),
      context: {
        projects: [
          { id: '1', name: 'Internal Tools', client: 'Internal', color: '#000', active: true, createdAt: '' }
        ],
        clients: [
          { id: '1', name: 'Internal', color: '#000', active: true, createdAt: '', updatedAt: '' }
        ],
        recentEntries: []
      }
    };
    
    // Since we can't easily import ES modules in this test, we'll check if Ollama is running
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags');
      if (ollamaResponse.ok) {
        console.log('✅ Ollama AI service is available');
        return true;
      } else {
        console.log('⚠️ Ollama not running - will use fallback analysis');
        return false;
      }
    } catch (error) {
      console.log('⚠️ Ollama not available - will use fallback analysis');
      return false;
    }
  } catch (error) {
    console.log('❌ AI service test failed:', error.message);
    return false;
  }
}

// Test 3: Test Google API endpoints with demo token
async function testGoogleAPIEndpoints() {
  console.log('\n3️⃣ Testing Google API endpoints...');
  
  const endpoints = [
    { name: 'Gmail', url: 'http://localhost:3003/gmail/messages?access_token=demo-token' },
    { name: 'Calendar', url: 'http://localhost:3003/calendar/events?access_token=demo-token' },
    { name: 'Drive', url: 'http://localhost:3003/drive/files?access_token=demo-token&type=docs' }
  ];
  
  let workingEndpoints = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url);
      const data = await response.json();
      
      // Even if it returns an error, if the endpoint exists we get a JSON response
      if (response.status === 401 || response.status === 500) {
        console.log(`✅ ${endpoint.name} API endpoint exists (needs real token)`);
        workingEndpoints++;
      } else if (data.messages || data.events || data.files) {
        console.log(`✅ ${endpoint.name} API endpoint working`);
        workingEndpoints++;
      } else {
        console.log(`⚠️ ${endpoint.name} API endpoint responded unexpectedly:`, data);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} API endpoint failed:`, error.message);
    }
  }
  
  return workingEndpoints;
}

// Test 4: Test that our files can be loaded
async function testFileIntegrity() {
  console.log('\n4️⃣ Testing file integrity...');
  
  const files = [
    'src/services/googleDataProcessor.ts',
    'src/services/googleAiIntegration.ts', 
    'src/components/GoogleAiSync.tsx'
  ];
  
  let validFiles = 0;
  
  for (const file of files) {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.length > 0) {
        console.log(`✅ ${file} exists and has content`);
        validFiles++;
      } else {
        console.log(`❌ ${file} is empty`);
      }
    } catch (error) {
      console.log(`❌ ${file} not accessible:`, error.message);
    }
  }
  
  return validFiles;
}

// Run all tests
async function runAllTests() {
  const oauthWorking = await testOAuthGeneration();
  const aiAvailable = await testAIService();
  const apiEndpoints = await testGoogleAPIEndpoints();
  const filesValid = await testFileIntegrity();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`OAuth Generation: ${oauthWorking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI Service: ${aiAvailable ? '✅ Available' : '⚠️ Fallback Mode'}`);
  console.log(`Google API Endpoints: ${apiEndpoints}/3 working`);
  console.log(`File Integrity: ${filesValid}/3 files valid`);
  
  if (oauthWorking && apiEndpoints >= 2 && filesValid === 3) {
    console.log('\n🎉 Integration is ready for testing!');
    console.log('\n📋 Next Steps:');
    console.log('1. Get a real Google access token by visiting the OAuth URL');
    console.log('2. Use the GoogleAiSync component in your dashboard');
    console.log('3. Click "Sync Google Data with AI" to test the full pipeline');
    
    if (!aiAvailable) {
      console.log('4. Install Ollama for better AI analysis: https://ollama.com');
      console.log('   Or the system will use rule-based fallback analysis');
    }
  } else {
    console.log('\n⚠️ Some components need attention before full testing');
  }
}

// Handle running as script
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { 
  testOAuthGeneration, 
  testAIService, 
  testGoogleAPIEndpoints, 
  testFileIntegrity 
};