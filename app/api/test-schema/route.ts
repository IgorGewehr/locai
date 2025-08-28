import { NextRequest, NextResponse } from 'next/server';
import { UpdatePropertySchema } from '@/lib/validation/property-schemas';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Testing UpdatePropertySchema validation...');

    // Test case 1: updatedAt as string (should pass now)
    const testData1 = {
      title: "Test Property",
      basePrice: 150,
      updatedAt: "2025-08-28T01:51:33.215Z" // String format - the problematic case
    };

    const result1 = UpdatePropertySchema.safeParse(testData1);
    console.log('Test 1 - updatedAt as string:');
    console.log('Success:', result1.success);
    if (!result1.success) {
      console.log('Errors:', result1.error.flatten());
    }

    // Test case 2: updatedAt as Date (should pass)
    const testData2 = {
      title: "Test Property 2", 
      basePrice: 200,
      updatedAt: new Date()
    };

    const result2 = UpdatePropertySchema.safeParse(testData2);
    console.log('Test 2 - updatedAt as Date:');
    console.log('Success:', result2.success);
    if (!result2.success) {
      console.log('Errors:', result2.error.flatten());
    }

    // Test case 3: without updatedAt (should pass - optional)
    const testData3 = {
      title: "Test Property 3",
      basePrice: 300
    };

    const result3 = UpdatePropertySchema.safeParse(testData3);
    console.log('Test 3 - without updatedAt:');
    console.log('Success:', result3.success);
    if (!result3.success) {
      console.log('Errors:', result3.error.flatten());
    }

    return NextResponse.json({
      success: true,
      tests: [
        { case: 'updatedAt as string', success: result1.success, errors: result1.success ? null : result1.error.flatten() },
        { case: 'updatedAt as Date', success: result2.success, errors: result2.success ? null : result2.error.flatten() },
        { case: 'without updatedAt', success: result3.success, errors: result3.success ? null : result3.error.flatten() }
      ]
    });

  } catch (error) {
    console.error('Schema test error:', error);
    return NextResponse.json({ error: 'Schema test failed', details: error.message }, { status: 500 });
  }
}