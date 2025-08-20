#!/usr/bin/env node

// Debug direto do QR code sem cache
const microserviceUrl = 'http://167.172.116.195:3000';
const apiKey = 'tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=';
const tenantId = `test-emergency-${Date.now()}`;

async function testQRDirectly() {
  console.log('🎯 DIRECT QR CODE DEBUG - New Session\n');
  console.log('🔄 Tenant ID:', tenantId);
  
  try {
    // 1. Start a completely new session
    console.log('1️⃣ Starting fresh session...');
    const startResponse = await fetch(`${microserviceUrl}/api/v1/sessions/${tenantId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Tenant-ID': tenantId
      }
    });
    
    console.log(`Start Status: ${startResponse.status}`);
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('Start Response Structure:');
      console.log('Keys:', Object.keys(startData));
      console.log('Has QR Code:', !!startData.qrCode);
      console.log('Has Data.QR:', !!(startData.data && startData.data.qrCode));
      console.log('Connected:', startData.connected);
      
      if (startData.qrCode) {
        console.log('✅ QR CODE FOUND IN START RESPONSE!');
        console.log('Type:', startData.qrCode.startsWith('data:image/png;base64,') ? 'Base64 PNG' : 'Other');
        console.log('Length:', startData.qrCode.length);
        return true;
      }
    }
    
    // 2. Check status immediately after
    console.log('\n2️⃣ Checking status after start...');
    const statusResponse = await fetch(`${microserviceUrl}/api/v1/sessions/${tenantId}/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('Status Response Structure:');
      console.log('Keys:', Object.keys(statusData));
      console.log('Data Keys:', statusData.data ? Object.keys(statusData.data) : 'no data');
      console.log('Has QR Code:', !!(statusData.data && statusData.data.qrCode));
      console.log('Status:', statusData.data ? statusData.data.status : 'no status');
      
      if (statusData.data && statusData.data.qrCode) {
        console.log('✅ QR CODE FOUND IN STATUS RESPONSE!');
        console.log('Type:', statusData.data.qrCode.startsWith('data:image/png;base64,') ? 'Base64 PNG' : 'Other');
        console.log('Length:', statusData.data.qrCode.length);
        return true;
      }
    }
    
    // 3. Wait a moment and check again
    console.log('\n3️⃣ Waiting 3 seconds and checking again...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalResponse = await fetch(`${microserviceUrl}/api/v1/sessions/${tenantId}/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (finalResponse.ok) {
      const finalData = await finalResponse.json();
      console.log('Final Status:');
      console.log('Has QR Code:', !!(finalData.data && finalData.data.qrCode));
      console.log('Status:', finalData.data ? finalData.data.status : 'no status');
      console.log('Connected:', finalData.data ? finalData.data.connected : 'unknown');
      
      if (finalData.data && finalData.data.qrCode) {
        console.log('✅ QR CODE FOUND IN FINAL CHECK!');
        return true;
      }
    }
    
    console.log('❌ No QR code found in any response');
    return false;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

testQRDirectly().then(success => {
  if (success) {
    console.log('\n🎉 QR CODE GENERATION WORKING!');
  } else {
    console.log('\n⚠️ QR Code generation may need microservice restart or config check');
  }
});