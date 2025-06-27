import http from 'http';
import https from 'https';

const BASE_URL = 'http://localhost:3001/mchatbot-widget';

// Simple HTTP request function
function makeRequest(url, callback) {
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      callback(null, {
        statusCode: res.statusCode,
        headers: res.headers,
        data: data
      });
    });
  }).on('error', (err) => {
    callback(err);
  });
}

// Test functions
function testHealth() {
  console.log('🏥 Testing Health Endpoint...');
  makeRequest(`${BASE_URL}/health`, (err, result) => {
    if (err) {
      console.log('❌ Health check failed:', err.message);
      return;
    }
    if (result.statusCode === 200) {
      console.log('✅ Health check passed');
      try {
        const data = JSON.parse(result.data);
        console.log('   Status:', data.status);
        console.log('   Timestamp:', data.timestamp);
      } catch (e) {
        console.log('   Response:', result.data);
      }
    } else {
      console.log('❌ Health check failed with status:', result.statusCode);
    }
    console.log('');
  });
}

function testWidgetScript() {
  console.log('📜 Testing Widget Script...');
  makeRequest(`${BASE_URL}/mchatbot.js`, (err, result) => {
    if (err) {
      console.log('❌ Widget script test failed:', err.message);
      return;
    }
    if (result.statusCode === 200) {
      console.log('✅ Widget script accessible');
      console.log('   Content-Type:', result.headers['content-type']);
      console.log('   Content-Length:', result.headers['content-length']);
      console.log('   CORS Headers:', {
        'Access-Control-Allow-Origin': result.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': result.headers['access-control-allow-methods']
      });
    } else {
      console.log('❌ Widget script failed with status:', result.statusCode);
    }
    console.log('');
  });
}

function testDemoPage() {
  console.log('🏠 Testing Demo Page...');
  makeRequest(`${BASE_URL}/`, (err, result) => {
    if (err) {
      console.log('❌ Demo page test failed:', err.message);
      return;
    }
    if (result.statusCode === 200) {
      console.log('✅ Demo page accessible');
      console.log('   Content-Type:', result.headers['content-type']);
      console.log('   Content-Length:', result.headers['content-length']);
      if (result.data.includes('mchatbot-widget')) {
        console.log('   ✅ Contains widget element');
      } else {
        console.log('   ❌ Missing widget element');
      }
    } else {
      console.log('❌ Demo page failed with status:', result.statusCode);
    }
    console.log('');
  });
}

function test404() {
  console.log('🚫 Testing 404 Handler...');
  makeRequest(`${BASE_URL}/nonexistent`, (err, result) => {
    if (err) {
      console.log('❌ 404 test failed:', err.message);
      return;
    }
    if (result.statusCode === 404) {
      console.log('✅ 404 handler working correctly');
      try {
        const data = JSON.parse(result.data);
        console.log('   Error:', data.error);
        console.log('   Message:', data.message);
      } catch (e) {
        console.log('   Response:', result.data);
      }
    } else {
      console.log('❌ 404 handler failed with status:', result.statusCode);
    }
    console.log('');
  });
}

// Run all tests
console.log('🧪 MChatBot Widget - Local Testing');
console.log('=====================================\n');

// Wait a bit for server to start if needed
setTimeout(() => {
  testHealth();
  setTimeout(testWidgetScript, 500);
  setTimeout(testDemoPage, 1000);
  setTimeout(test404, 1500);
  setTimeout(() => {
    console.log('🎉 Testing complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Open http://localhost:3001/mchatbot-widget/ in your browser');
    console.log('2. Open test-cors.html in your browser to test CORS');
    console.log('3. Check browser console for any errors');
  }, 2000);
}, 1000); 