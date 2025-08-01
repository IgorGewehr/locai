/**
 * Utilities for WhatsApp message handling
 */

/**
 * Check if a WhatsApp JID (Jabber ID) is from a group
 * @param jid - The WhatsApp JID to check
 * @returns true if the JID is from a group, false otherwise
 */
export function isGroupMessage(jid: string): boolean {
  if (!jid) return false;
  
  // Groups in WhatsApp have JID format: groupId@g.us
  // Individual messages have format: phoneNumber@s.whatsapp.net
  
  // Direct group check
  if (jid.endsWith('@g.us')) {
    return true;
  }
  
  // Additional checks for group patterns
  // Groups often have format like: 123456789-987654321@g.us
  if (jid.includes('@g.us')) {
    return true;
  }
  
  // Some group formats might have different patterns
  // Check for common group ID patterns (contains hyphens and @ symbol)
  if (jid.includes('-') && jid.includes('@') && !jid.includes('@s.whatsapp.net')) {
    return true;
  }
  
  return false;
}

/**
 * Check if a WhatsApp JID is from an individual user
 * @param jid - The WhatsApp JID to check
 * @returns true if the JID is from an individual user, false otherwise
 */
export function isIndividualMessage(jid: string): boolean {
  if (!jid) return false;
  
  // Individual messages should end with @s.whatsapp.net
  if (jid.endsWith('@s.whatsapp.net')) {
    return true;
  }
  
  // Check for other individual formats
  if (jid.endsWith('@c.us')) {
    return true;
  }
  
  return false;
}

/**
 * Extract phone number from WhatsApp JID
 * @param jid - The WhatsApp JID
 * @returns cleaned phone number or original JID if not a phone number
 */
export function extractPhoneNumber(jid: string): string {
  if (!jid) return '';
  
  // For individual messages, remove the @s.whatsapp.net suffix
  if (jid.endsWith('@s.whatsapp.net')) {
    return jid.replace('@s.whatsapp.net', '');
  }
  
  // For other formats, remove common suffixes
  if (jid.endsWith('@c.us')) {
    return jid.replace('@c.us', '');
  }
  
  return jid;
}

/**
 * Validate that a message should be processed by the AI agent
 * @param jid - The WhatsApp JID to validate
 * @returns true if the message should be processed, false otherwise
 */
export function shouldProcessMessage(jid: string): boolean {
  if (!jid) return false;
  
  // Don't process group messages
  if (isGroupMessage(jid)) {
    return false;
  }
  
  // Only process individual messages
  if (isIndividualMessage(jid)) {
    return true;
  }
  
  return false;
}

// Test function to verify the filter works correctly
export function testGroupFilter() {
  console.log('🧪 Testing WhatsApp Group Filter');
  console.log('================================');
  
  const testCases = [
    // Individual messages (should be processed)
    { jid: '555496657079@s.whatsapp.net', expected: true, description: 'Individual message' },
    { jid: '5511999999999@s.whatsapp.net', expected: true, description: 'Individual message with country code' },
    { jid: '555496657079@c.us', expected: true, description: 'Individual message (old format)' },
    
    // Group messages (should NOT be processed)
    { jid: '120363042341234567@g.us', expected: false, description: 'Group message' },
    { jid: '123456789-987654321@g.us', expected: false, description: 'Group message with hyphen' },
    { jid: '5511999999999-1234567890@g.us', expected: false, description: 'Group message with phone pattern' },
    
    // Edge cases
    { jid: '', expected: false, description: 'Empty JID' },
    { jid: 'invalid', expected: false, description: 'Invalid JID' },
    { jid: '555496657079', expected: false, description: 'Phone number without suffix' },
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    const result = shouldProcessMessage(testCase.jid);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  JID: ${testCase.jid}`);
    console.log(`  Expected: ${testCase.expected ? 'PROCESS' : 'IGNORE'}`);
    console.log(`  Result: ${result ? 'PROCESS' : 'IGNORE'}`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
    
    if (passed) passedTests++;
  });

  console.log('================================');
  console.log(`Tests passed: ${passedTests}/${totalTests}`);
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  console.log(`Success rate: ${successRate}%`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Group filter is working correctly.');
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
  }

  return passedTests === totalTests;
}