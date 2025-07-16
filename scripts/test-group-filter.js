// Test script to verify group message filtering
import { isGroupMessage, isIndividualMessage, shouldProcessMessage } from '../lib/utils/whatsapp-utils.js';

console.log('🧪 Testing WhatsApp Group Filter');
console.log('================================');

// Test cases
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
console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Group filter is working correctly.');
} else {
  console.log('❌ Some tests failed. Please check the implementation.');
}

// Additional detailed tests
console.log('\n🔍 Detailed Analysis:');
console.log('====================');

const detailedTests = [
  '555496657079@s.whatsapp.net',
  '120363042341234567@g.us',
  '123456789-987654321@g.us',
];

detailedTests.forEach(jid => {
  console.log(`\nAnalyzing: ${jid}`);
  console.log(`  isGroupMessage: ${isGroupMessage(jid)}`);
  console.log(`  isIndividualMessage: ${isIndividualMessage(jid)}`);
  console.log(`  shouldProcessMessage: ${shouldProcessMessage(jid)}`);
});