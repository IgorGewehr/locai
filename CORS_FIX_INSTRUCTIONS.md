# 🚨 Firebase Storage CORS Configuration Fix

## Problem Identified
The uploads are failing due to CORS (Cross-Origin Resource Sharing) policy blocking requests from `http://localhost:3000` to Firebase Storage.

**Error:** `Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy`

## Solution

You need to configure CORS for your Firebase Storage bucket. Here are three ways to fix this:

### Method 1: Using gsutil Command Line (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   - Windows: Download from https://cloud.google.com/sdk/docs/install
   - Or use npm: `npm install -g @google-cloud/storage-tools`

2. **Login to Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your project**:
   ```bash
   gcloud config set project locai-76dcf
   ```

4. **Apply CORS configuration**:
   ```bash
   # For development (allows all origins)
   gsutil cors set cors.json gs://locai-76dcf.appspot.com
   
   # OR for production (restricted origins)
   gsutil cors set cors-production.json gs://locai-76dcf.appspot.com
   ```

5. **Verify the configuration**:
   ```bash
   gsutil cors get gs://locai-76dcf.appspot.com
   ```

### Method 2: Using Firebase Console (Manual)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `locai-76dcf`
3. Navigate to **Cloud Storage** → **Buckets**
4. Find your bucket: `locai-76dcf.appspot.com`
5. Click on the bucket
6. Go to **Configuration** tab
7. Edit CORS configuration
8. Paste the content from `cors.json`

### Method 3: Using Firebase Admin SDK Script

Create a Node.js script to apply CORS:

```javascript
// setup-cors.js
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  projectId: 'locai-76dcf',
  keyFilename: 'path/to/service-account-key.json' // Your service account key
});

async function configureCors() {
  const bucket = storage.bucket('locai-76dcf.appspot.com');
  
  await bucket.setCorsConfiguration([
    {
      origin: ['*'], // Or specific origins for production
      method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
      maxAgeSeconds: 3600,
      responseHeader: [
        'Content-Type',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
        'Access-Control-Max-Age',
        'Access-Control-Allow-Credentials',
        'x-goog-content-length-range',
        'x-goog-resumable'
      ],
    },
  ]);
  
  console.log('✅ CORS configuration applied successfully!');
}

configureCors().catch(console.error);
```

## Quick Fix Script

We've created a script to help you:

```bash
./scripts/setup-cors.sh
```

This script will guide you through the process.

## CORS Configuration Files

- **`cors.json`**: Development configuration (allows all origins) - USE THIS FOR NOW
- **`cors-production.json`**: Production configuration (restricted origins)

## After Applying CORS

1. **Wait 1-2 minutes** for the changes to propagate
2. **Clear your browser cache** (Ctrl+Shift+Delete)
3. **Restart your development server**:
   ```bash
   npm run dev
   ```
4. **Test the upload** again at `/test-storage`

## Verification

After applying CORS, you should see this when checking:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [...]
  }
]
```

## Still Having Issues?

If uploads still fail after CORS configuration:

1. **Check Firebase Storage Rules**: Make sure authentication is not blocking uploads
2. **Check Network**: Ensure no firewall/proxy is blocking Firebase
3. **Check Browser Console**: Look for new error messages
4. **Try Incognito Mode**: Rules out browser extensions interference

## Security Note

The current `cors.json` allows all origins (`"*"`). This is fine for development but should be restricted in production using `cors-production.json`.

## Support

If you continue to have issues, check:
- Firebase Storage bucket exists and is active
- Your Firebase project is not suspended
- You have proper permissions in the Firebase project