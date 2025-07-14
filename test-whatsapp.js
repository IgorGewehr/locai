// Simple test to check WhatsApp session initialization
async function testWhatsApp() {
  try {
    console.log('Testing WhatsApp session initialization...');
    
    // Test session status
    const statusResponse = await fetch('http://localhost:3000/api/whatsapp/session');
    const statusData = await statusResponse.json();
    console.log('Current status:', statusData);
    
    // Initialize session
    console.log('Initializing session...');
    const initResponse = await fetch('http://localhost:3000/api/whatsapp/session', {
      method: 'POST',
    });
    const initData = await initResponse.json();
    console.log('Init response:', initData);
    
    // Check status again
    setTimeout(async () => {
      const newStatusResponse = await fetch('http://localhost:3000/api/whatsapp/session');
      const newStatusData = await newStatusResponse.json();
      console.log('New status:', newStatusData);
    }, 3000);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testWhatsApp();