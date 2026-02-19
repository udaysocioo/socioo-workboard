const http = require('http');

console.log('Starting Backend Hardening Verification...');

// Configuration (adjust port if needed)
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make requests
const request = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            headers: res.headers, 
            body: data ? JSON.parse(data) : {} 
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  try {
    // 1. Test Error Formatting (Login with bad PIN)
    console.log('\n[TEST 1] Testing Error Response Format (Invalid Login)...');
    const loginRes = await request('/api/auth/login', 'POST', { pin: 'WRONG_PIN' });
    
    if (loginRes.body.success === false && loginRes.body.code && loginRes.body.status) {
      console.log('✅ Standard Error Format confirmed:', JSON.stringify(loginRes.body));
    } else {
      console.error('❌ Failed Standard Error Format:', loginRes.body);
    }

    // 2. Test Security Headers (Helmet)
    console.log('\n[TEST 2] Testing Security Headers...');
    const healthRes = await request('/'); // Or any endpoint
    
    // Check for standard Helmet headers like X-DNS-Prefetch-Control, X-Frame-Options, etc.
    // Or just check if we get a response (server running)
    // Note: Default helmet headers might vary, but 'x-powered-by' should be hidden or obscured if we wanted to (Express default is on, Helmet removes it).
    if (!healthRes.headers['x-powered-by']) {
      console.log('✅ X-Powered-By header is hidden (Helmet active).');
    } else {
      console.log('⚠️ X-Powered-By header is present (Helmet might not be removing it, or configured to keep it).');
    }

    // 3. Test Rate Limiting (Optional - checking headers)
    console.log('\n[TEST 3] Testing Rate Limit Headers...');
    if (healthRes.headers['x-ratelimit-limit']) {
      console.log('✅ Rate Limit headers present.');
    } else {
      console.log('⚠️ Rate Limit headers missing (Rate limiting might be disabled or not exposing headers).');
    }
    
    console.log('\nVerification Complete. If you see green checks, the hardening constraints are active.');

  } catch (error) {
    console.error('\n❌ Could not connect to server. Is it running on port 5000?', error.message);
  }
}

runTests();
