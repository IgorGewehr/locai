import { z } from 'zod';

// Test the updatedAt validation that was causing issues
const UpdatePropertySchema = z.object({
  title: z.string().min(1, 'Título não pode estar vazio').optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  basePrice: z.number().positive().max(100000).optional(),
  photos: z.array(z.any()).max(30, 'Máximo de 30 fotos').optional(),
  videos: z.array(z.any()).max(5, 'Máximo de 5 vídeos').optional(),
  updatedAt: z.union([z.date(), z.string(), z.coerce.date()]).optional(),
  id: z.string().optional(),
  tenantId: z.string().optional(),
}).passthrough();

console.log('🔍 Testing UpdatePropertySchema validation...');

// Test case 1: updatedAt as string (the problematic case)
const testData1 = {
  title: "Test Property",
  basePrice: 150,
  updatedAt: "2025-08-28T01:51:33.215Z" // String format - this was failing before
};

const result1 = UpdatePropertySchema.safeParse(testData1);
console.log('\n✅ Test 1 - updatedAt as string:');
console.log('Success:', result1.success);
if (!result1.success) {
  console.log('❌ Errors:', JSON.stringify(result1.error.flatten(), null, 2));
} else {
  console.log('✅ Parsed data:', result1.data);
}

// Test case 2: updatedAt as Date object
const testData2 = {
  title: "Test Property 2",
  basePrice: 200,
  updatedAt: new Date()
};

const result2 = UpdatePropertySchema.safeParse(testData2);
console.log('\n✅ Test 2 - updatedAt as Date:');
console.log('Success:', result2.success);
if (!result2.success) {
  console.log('❌ Errors:', JSON.stringify(result2.error.flatten(), null, 2));
} else {
  console.log('✅ Parsed data:', result2.data);
}

// Test case 3: without updatedAt (should pass - optional)
const testData3 = {
  title: "Test Property 3",
  basePrice: 300
};

const result3 = UpdatePropertySchema.safeParse(testData3);
console.log('\n✅ Test 3 - without updatedAt:');
console.log('Success:', result3.success);
if (!result3.success) {
  console.log('❌ Errors:', JSON.stringify(result3.error.flatten(), null, 2));
} else {
  console.log('✅ Parsed data:', result3.data);
}

// Test case 4: Complex nested object (simulating real property update)
const testData4 = {
  title: "Apartamento em Piratuba",
  description: "Excelente apartamento na região de Piratuba",
  bedrooms: 2,
  bathrooms: 1,
  maxGuests: 4,
  basePrice: 120,
  photos: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
  videos: ["https://example.com/video1.mp4"],
  updatedAt: "2025-08-28T01:51:33.215Z", // The problematic string format
  tenantId: "test-tenant",
  id: "test-property-id"
};

const result4 = UpdatePropertySchema.safeParse(testData4);
console.log('\n✅ Test 4 - Complex property update with string updatedAt:');
console.log('Success:', result4.success);
if (!result4.success) {
  console.log('❌ Errors:', JSON.stringify(result4.error.flatten(), null, 2));
} else {
  console.log('✅ Parsed data keys:', Object.keys(result4.data));
  console.log('✅ updatedAt type:', typeof result4.data.updatedAt);
  console.log('✅ updatedAt value:', result4.data.updatedAt);
}

console.log('\n🎯 Schema validation test completed!');