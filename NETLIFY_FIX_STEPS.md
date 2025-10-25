# IMMEDIATE FIX: Netlify Environment Variables 4KB Limit

## Problem
Your deployment fails with: "Your environment variables exceed the 4KB limit imposed by AWS Lambda"

## Root Cause
You have **44+ environment variables** in Netlify UI that are being injected into every Lambda function, exceeding the 4KB limit.

## THE FIX (Step-by-Step)

### Step 1: Go to Netlify Dashboard
1. Log into Netlify
2. Select your site
3. Go to **Site settings** → **Environment variables**

### Step 2: DELETE These Variables from Netlify UI

**DELETE ALL OF THESE** (they're either unnecessary or hardcoded):

#### Firebase Credentials (HARDCODED in `lib/firebase/admin.ts`)
- ❌ `FIREBASE_PROJECT_ID` - DELETE (hardcoded)
- ❌ `FIREBASE_CLIENT_EMAIL` - DELETE (hardcoded)
- ❌ `FIREBASE_PRIVATE_KEY` - DELETE (hardcoded)
- ❌ `FIREBASE_STORAGE_BUCKET` - DELETE (hardcoded)

#### Build-Only Variables (NOT needed at runtime)
- ❌ `NODE_VERSION` - DELETE (in netlify.toml)
- ❌ `NEXT_TELEMETRY_DISABLED` - DELETE (in netlify.toml)
- ❌ `NODE_OPTIONS` - DELETE (in netlify.toml)
- ❌ `NPM_CONFIG_CACHE` - DELETE (in netlify.toml)
- ❌ `CYPRESS_CACHE_FOLDER` - DELETE (in netlify.toml)
- ❌ `NETLIFY_NEXT_PLUGIN_CACHE` - DELETE (in netlify.toml)

#### Feature Flags (Can be removed or set to defaults)
- ❌ `ENABLE_ANALYTICS` - DELETE (optional)
- ❌ `ENABLE_PAYMENT_PROCESSING` - DELETE (optional)
- ❌ `ENABLE_WHATSAPP_WEB` - DELETE (optional)
- ❌ `DISABLE_WHATSAPP_WEB` - DELETE (optional)
- ❌ `WHATSAPP_USE_EXTERNAL` - DELETE (optional)
- ❌ `PROFESSIONAL_AGENT_ENABLED` - DELETE (optional)

#### Configuration Values (Can use defaults)
- ❌ `AI_REQUEST_TIMEOUT_MS` - DELETE (can use default in code)
- ❌ `API_RATE_LIMIT_MAX_REQUESTS` - DELETE (can use default in code)
- ❌ `API_RATE_LIMIT_WINDOW_MS` - DELETE (can use default in code)
- ❌ `CACHE_TTL_SECONDS` - DELETE (can use default in code)
- ❌ `MAX_CONCURRENT_AI_REQUESTS` - DELETE (can use default in code)
- ❌ `LOG_LEVEL` - DELETE (can use default)

#### Duplicate/Unnecessary
- ❌ `NEXT_PUBLIC_DEBUG_MODE` - DELETE (not needed in production)
- ❌ `AIRBNB` - DELETE (if not using Airbnb integration)
- ❌ `TENANT_ID` - DELETE (use NEXT_PUBLIC_TENANT_ID instead)

### Step 3: KEEP Only These Essential Variables

Keep these **16-20 variables maximum** in Netlify UI:

#### ✅ Next.js Public Variables (7 variables)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=locai-76dcf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=locai-76dcf
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=locai-76dcf.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-value
NEXT_PUBLIC_FIREBASE_APP_ID=your-value
NEXT_PUBLIC_BASE_URL=https://your-site.netlify.app
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
NEXT_PUBLIC_TENANT_ID=your-tenant-id
```

#### ✅ Security & Auth (3 variables)
```
JWT_SECRET=your-long-secret-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-site.netlify.app
```

#### ✅ AI Integration (4 variables - if using)
```
OPENAI_API_KEY=sk-your-key
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/id
N8N_API_KEY=your-key
N8N_WEBHOOK_SECRET=your-secret
```

#### ✅ WhatsApp Integration (3 variables - if using)
```
WHATSAPP_MICROSERVICE_URL=https://your-whatsapp-server.com
WHATSAPP_MICROSERVICE_API_KEY=your-key
WHATSAPP_WEBHOOK_SECRET=your-secret
```

#### ✅ Miscellaneous (3 variables)
```
NODE_ENV=production
ENABLE_AI_AGENT=true
ENABLE_WHATSAPP_INTEGRATION=true
CRON_SECRET=your-cron-secret
MAPS_KEY=your-google-maps-key
```

### Step 4: Verify Your Changes

After deleting variables, you should have approximately **20-25 variables** instead of 44+.

Total size should be well under 4KB (approximately 2-3KB).

### Step 5: Re-deploy

After cleaning up environment variables:

```bash
# Commit the netlify.toml changes
git add netlify.toml .env.production NETLIFY_FIX_STEPS.md
git commit -m "fix: reduce environment variables for Lambda 4KB limit"
git push
```

Netlify will automatically trigger a new deployment.

## Quick Checklist

- [ ] Deleted all Firebase credentials from Netlify UI (they're hardcoded)
- [ ] Deleted all build-only variables from Netlify UI (they're in netlify.toml)
- [ ] Deleted all feature flags from Netlify UI (can use defaults)
- [ ] Kept only 20-25 essential runtime variables
- [ ] Verified total env vars size < 3KB
- [ ] Pushed changes to trigger new deployment

## Expected Result

Your deployment should succeed with:
```
✅ Functions bundling completed
✅ Deploy site completed
✅ Site is live
```

## If It Still Fails

If you still get the error after following these steps:

1. Count your remaining environment variables in Netlify UI
2. The limit is approximately **50-60 short variables** or **20-30 long variables**
3. FIREBASE_PRIVATE_KEY alone is ~1.7KB, so if you still have it in Netlify UI, DELETE IT

## Support

If you need help, check:
- Current variables in Netlify: Site Settings → Environment variables
- Build logs: Deploys → Latest deploy → Deploy log
- Function size: Look for "environment variables" in the error message
