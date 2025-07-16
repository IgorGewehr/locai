// Test script to diagnose Firebase upload issues
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔧 Firebase Upload Test Starting...');
console.log('================================');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('- API Key:', firebaseConfig.apiKey ? 'Set' : 'Missing');
console.log('- Auth Domain:', firebaseConfig.authDomain);
console.log('- Project ID:', firebaseConfig.projectId);
console.log('- Storage Bucket:', firebaseConfig.storageBucket);
console.log('- Messaging Sender ID:', firebaseConfig.messagingSenderId);
console.log('- App ID:', firebaseConfig.appId ? 'Set' : 'Missing');

// Check for missing configuration
const missingConfigs = [];
if (!firebaseConfig.apiKey) missingConfigs.push('API Key');
if (!firebaseConfig.authDomain) missingConfigs.push('Auth Domain');
if (!firebaseConfig.projectId) missingConfigs.push('Project ID');
if (!firebaseConfig.storageBucket) missingConfigs.push('Storage Bucket');
if (!firebaseConfig.messagingSenderId) missingConfigs.push('Messaging Sender ID');
if (!firebaseConfig.appId) missingConfigs.push('App ID');

if (missingConfigs.length > 0) {
  console.error('❌ Missing Firebase configuration:', missingConfigs.join(', '));
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

console.log('\n🔐 Firebase Services Initialized');
console.log('- Storage:', storage ? 'Ready' : 'Failed');
console.log('- Auth:', auth ? 'Ready' : 'Failed');

// Test upload function
async function testUpload() {
  try {
    console.log('\n📤 Testing Upload Process...');
    
    // Create a test file (simple text file)
    const testContent = 'This is a test file for Firebase upload';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `test-upload-${timestamp}.txt`;
    
    console.log('📝 Test file created:', fileName);
    console.log('📏 File size:', testFile.size, 'bytes');
    
    // Create storage reference
    const storageRef = ref(storage, `test-uploads/${fileName}`);
    console.log('📍 Storage reference created:', storageRef.fullPath);
    
    // Test upload
    console.log('⏳ Starting upload...');
    const uploadResult = await uploadBytes(storageRef, testFile);
    console.log('✅ Upload successful!');
    console.log('📊 Upload result:', uploadResult.metadata.name);
    
    // Test download URL
    console.log('🔗 Getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Download URL obtained:', downloadURL);
    
    console.log('\n🎉 All tests passed! Firebase upload is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Upload test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Provide specific troubleshooting
    if (error.code === 'storage/unauthorized') {
      console.log('\n🔧 Troubleshooting: Unauthorized error');
      console.log('- Check Firebase Storage rules');
      console.log('- Ensure user is authenticated');
      console.log('- Verify storage bucket permissions');
    } else if (error.code === 'storage/quota-exceeded') {
      console.log('\n🔧 Troubleshooting: Quota exceeded');
      console.log('- Check Firebase Storage quota');
      console.log('- Upgrade Firebase plan if needed');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      console.log('\n🔧 Troubleshooting: Retry limit exceeded');
      console.log('- Check internet connection');
      console.log('- Try again later');
    }
  }
}

// Run test
testUpload();