#!/usr/bin/env node
import { storage } from '../lib/firebase/config';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

async function testStorage() {
  console.log('🧪 Testing Firebase Storage...');
  
  console.log('Storage instance:', {
    hasStorage: !!storage,
    storageType: typeof storage,
    storageApp: (storage as any).app?.name,
    storageBucket: (storage as any).app?.options?.storageBucket
  });
  
  try {
    // Create a test reference
    const testPath = `test/test-${Date.now()}.txt`;
    console.log(`📝 Creating test file at: ${testPath}`);
    
    const storageRef = ref(storage, testPath);
    console.log('Storage reference:', {
      fullPath: storageRef.fullPath,
      bucket: storageRef.bucket,
      name: storageRef.name
    });
    
    // Upload test data
    const testData = 'Hello Firebase Storage!';
    console.log('📤 Uploading test data...');
    
    const snapshot = await uploadString(storageRef, testData, 'raw');
    console.log('✅ Upload successful!', {
      fullPath: snapshot.ref.fullPath,
      bucket: snapshot.ref.bucket
    });
    
    // Get download URL
    const url = await getDownloadURL(snapshot.ref);
    console.log('🔗 Download URL:', url);
    
    console.log('✅ Storage test completed successfully!');
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
        serverResponse: (error as any).serverResponse
      });
    }
  }
}

// Run if executed directly
if (require.main === module) {
  testStorage();
}

export { testStorage };