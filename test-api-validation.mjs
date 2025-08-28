// Import the UpdatePropertySchema directly from the validation file
import { UpdatePropertySchema } from './lib/validation/property-schemas.js';

console.log('🔍 Testing actual UpdatePropertySchema from API validation...');
console.log('📁 Importing from: ./lib/validation/property-schemas.js');

// Test the exact problematic data that was causing the "Expected date, received string" error
const problematicData = {
  title: "Test Property Update",
  basePrice: 150,
  updatedAt: "2025-08-28T01:51:33.215Z", // This was causing "Expected date, received string"
  photos: ["https://example.com/photo1.jpg"],
  videos: ["https://example.com/video1.mp4"]
};

console.log('\n📋 Testing problematic data:', JSON.stringify(problematicData, null, 2));

const result = UpdatePropertySchema.safeParse(problematicData);

console.log('\n📊 Validation Result:');
console.log('✅ Success:', result.success);

if (!result.success) {
  console.log('❌ VALIDATION FAILED!');
  console.log('Field Errors:', JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  console.log('Form Errors:', JSON.stringify(result.error.flatten().formErrors, null, 2));
  
  // Check specifically for updatedAt error
  if (result.error.flatten().fieldErrors.updatedAt) {
    console.log('\n🚨 updatedAt Error Details:');
    console.log(result.error.flatten().fieldErrors.updatedAt);
  }
} else {
  console.log('✅ VALIDATION PASSED!');
  console.log('Parsed Data:', JSON.stringify(result.data, null, 2));
  console.log('\n🎯 updatedAt field details:');
  console.log('Type:', typeof result.data.updatedAt);
  console.log('Value:', result.data.updatedAt);
}

// Test another format to be comprehensive
console.log('\n' + '='.repeat(50));
console.log('🔄 Testing with Date object...');

const dataWithDateObject = {
  ...problematicData,
  updatedAt: new Date()
};

const result2 = UpdatePropertySchema.safeParse(dataWithDateObject);
console.log('Success:', result2.success);
if (!result2.success) {
  console.log('Errors:', JSON.stringify(result2.error.flatten(), null, 2));
} else {
  console.log('✅ Date object validation also passed');
}

console.log('\n🏁 Test completed!');