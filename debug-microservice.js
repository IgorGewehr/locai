#!/usr/bin/env node

// Debug detalhado do microservice
const microserviceUrl = 'http://167.172.116.195:3000';
const apiKey = 'tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=';
const tenantId = 'default-tenant-emergency';

async function debugMicroservice() {
  console.log('🔍 MICROSERVICE DEBUG - Detailed Analysis\n');
  
  // Test 1: Health check
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(`${microserviceUrl}/health`);
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Health:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('Health check error:', error.message);
  }
  
  // Test 2: API info
  console.log('\n2️⃣ Testing API Info...');
  try {
    const response = await fetch(`${microserviceUrl}/api/v1/info`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('API Info:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('API info error:', error.message);
  }
  
  // Test 3: List sessions
  console.log('\n3️⃣ Testing List Sessions...');
  try {
    const response = await fetch(`${microserviceUrl}/api/v1/sessions`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Sessions:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('List sessions error:', error.message);
  }
  
  // Test 4: Get specific session status
  console.log('\n4️⃣ Testing Session Status...');
  try {
    const response = await fetch(`${microserviceUrl}/api/v1/sessions/${tenantId}/status`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Session Status:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('Session status error:', error.message);
  }
  
  // Test 5: Start session (the critical one)
  console.log('\n5️⃣ Testing Start Session (QR Generation)...');
  try {
    const response = await fetch(`${microserviceUrl}/api/v1/sessions/${tenantId}/start`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Start Session Response:');
      console.log('- Connected:', data.connected);
      console.log('- Has QR Code:', !!data.qrCode);
      console.log('- Status:', data.status);
      console.log('- Message:', data.message);
      if (data.qrCode) {
        console.log('- QR Code Length:', data.qrCode.length, 'characters');
        console.log('- QR Code Preview:', data.qrCode.substring(0, 100) + '...');
      }
    } else {
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('Start session error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Debug concluído! ✅');
}

debugMicroservice();