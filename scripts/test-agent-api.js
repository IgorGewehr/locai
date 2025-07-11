// scripts/test-agent-api.js
// Test script for the AI agent API
// Usage: node scripts/test-agent-api.js

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';

async function testAgentAPI() {
  console.log('🧪 Testing AI Agent API...\n');

  // Test cases
  const testCases = [
    {
      name: 'Basic property search',
      data: {
        message: 'Quero alugar uma casa na praia para 4 pessoas',
        clientPhone: '5511999999999',
        tenantId: 'test-tenant'
      }
    },
    {
      name: 'Price calculation',
      data: {
        message: 'Quanto custa a casa do Leblon para o fim de semana?',
        clientPhone: '5511999999999',
        tenantId: 'test-tenant'
      }
    },
    {
      name: 'Invalid phone number',
      data: {
        message: 'Test message',
        clientPhone: '123',
        tenantId: 'test-tenant'
      },
      expectError: true
    },
    {
      name: 'Empty message',
      data: {
        message: '',
        clientPhone: '5511999999999',
        tenantId: 'test-tenant'
      },
      expectError: true
    }
  ];

  for (const testCase of testCases) {
    console.log(`📍 Test: ${testCase.name}`);
    console.log(`   Request:`, JSON.stringify(testCase.data, null, 2));

    try {
      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-tenant-id': testCase.data.tenantId
        },
        body: JSON.stringify(testCase.data)
      });

      const data = await response.json();
      
      if (testCase.expectError) {
        if (!response.ok) {
          console.log(`   ✅ Expected error received:`, data.error || data.message);
        } else {
          console.log(`   ❌ Expected error but got success`);
        }
      } else {
        if (response.ok) {
          console.log(`   ✅ Success:`, data.data?.response?.substring(0, 100) + '...');
          console.log(`   📊 Metadata:`, {
            conversationId: data.data?.conversationId,
            clientId: data.data?.clientId,
            functionCalls: data.data?.functionResults?.length || 0
          });
        } else {
          console.log(`   ❌ Unexpected error:`, data.error || data.message);
        }
      }

      // Check rate limit headers
      const rateLimitHeaders = {
        limit: response.headers.get('X-RateLimit-Limit'),
        remaining: response.headers.get('X-RateLimit-Remaining'),
        reset: response.headers.get('X-RateLimit-Reset')
      };
      
      if (rateLimitHeaders.limit) {
        console.log(`   🚦 Rate Limit:`, rateLimitHeaders);
      }

    } catch (error) {
      console.log(`   ❌ Network error:`, error.message);
    }

    console.log('');
  }

  // Test rate limiting
  console.log('📍 Testing Rate Limiting...');
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(
      fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          message: `Test message ${i}`,
          clientPhone: '5511888888888',
          tenantId: 'rate-limit-test'
        })
      })
    );
  }

  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429).length;
  const successful = results.filter(r => r.status === 200).length;

  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   🚫 Rate Limited: ${rateLimited}`);
  console.log(`   Total: ${results.length}`);

  console.log('\n✨ Testing complete!');
}

// Run tests
testAgentAPI().catch(console.error);