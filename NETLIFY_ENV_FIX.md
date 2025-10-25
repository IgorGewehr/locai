# Netlify Environment Variables - 4KB Limit Fix

## Problem
Your Netlify deployment is failing with:
```
Failed to create function: invalid parameter for function creation:
Your environment variables exceed the 4KB limit imposed by AWS Lambda.
```

## Root Cause
AWS Lambda (which powers Netlify Functions) has a **hard 4KB limit** for environment variables. Your current setup has 50+ environment variables in the Netlify UI, and they're ALL being injected into every Lambda function.

## Solution: Reduce Environment Variables

### Step 1: Identify Build-Only vs Runtime Variables

**Build-Only Variables** (NOT needed in functions):
- `NEXT_TELEMETRY_DISABLED`
- `NODE_OPTIONS`
- `NPM_CONFIG_CACHE`
- `CYPRESS_CACHE_FOLDER`
- `NETLIFY_NEXT_PLUGIN_CACHE`
- `NODE_VERSION`

**Runtime Variables** (needed in functions):
- `FIREBASE_*` variables
- `NEXT_PUBLIC_*` variables
- `OPENAI_API_KEY`
- `N8N_*` variables
- `JWT_SECRET`
- `WHATSAPP_*` variables
- Database credentials

### Step 2: Clean Up Netlify Environment Variables

Go to your Netlify dashboard → Site Settings → Environment variables

**DELETE these variables from Netlify UI** (they're already in `netlify.toml` build section):
- `NODE_VERSION` ❌
- `NEXT_TELEMETRY_DISABLED` ❌
- `NODE_OPTIONS` ❌
- `NPM_CONFIG_CACHE` ❌
- `CYPRESS_CACHE_FOLDER` ❌
- `NETLIFY_NEXT_PLUGIN_CACHE` ❌

**DELETE duplicate/unused variables:**
- Any `NEXT_PUBLIC_*` variables that are duplicated
- Any test/debug variables you don't need in production
- Unused integration keys

### Step 3: Optimize Large Variables

**FIREBASE_PRIVATE_KEY** is likely your largest variable. Instead of storing it directly:

Option A: Use Base64 encoding (smaller):
```bash
# In your local terminal
echo $FIREBASE_PRIVATE_KEY | base64
```
Then in Netlify UI, set `FIREBASE_PRIVATE_KEY_B64` with the base64 value.

Update your Firebase initialization code:
```typescript
// lib/firebase/admin.ts or similar
const privateKey = process.env.FIREBASE_PRIVATE_KEY_B64
  ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, 'base64').toString('utf-8')
  : process.env.FIREBASE_PRIVATE_KEY;
```

Option B: Use Netlify Secrets (recommended):
Use Netlify's secret storage for sensitive values.

### Step 4: Consolidate Configuration

Create a `.env.production` file (NOT committed to git) with all production values:

```bash
# .env.production
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_URL=https://...
N8N_API_KEY=...
JWT_SECRET=your-long-secret-here
# ... other runtime variables
```

### Step 5: Update Netlify Environment Variables

In Netlify UI, keep ONLY these essential categories:

**Firebase (Required)**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` or `FIREBASE_PRIVATE_KEY_B64`

**Next.js Public (Required)**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_APP_URL`

**Security (Required)**
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

**AI Integration (Required)**
- `OPENAI_API_KEY`
- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`
- `N8N_WEBHOOK_SECRET`

**WhatsApp (If using)**
- `WHATSAPP_MICROSERVICE_URL`
- `WHATSAPP_MICROSERVICE_API_KEY`

**Optional Feature Flags (if needed)**
- `ENABLE_AI_AGENT`
- `ENABLE_WHATSAPP_INTEGRATION`

### Step 6: Verify Total Size

After cleanup, verify your environment variables are under 4KB:

```bash
# In Netlify UI, count the total characters of all env vars
# Total should be < 4000 characters
```

## Quick Fix Checklist

- [ ] Remove build-only variables from Netlify UI
- [ ] Remove duplicate variables
- [ ] Compress FIREBASE_PRIVATE_KEY using base64
- [ ] Keep only essential runtime variables in Netlify UI
- [ ] Verify total env var size < 4KB
- [ ] Re-deploy to Netlify

## Estimated Variable Count After Cleanup

You should have approximately **25-30 variables** instead of 50+, well under the 4KB limit.

## Alternative: Use Environment Variable Scoping

If you still hit the limit, use Netlify's environment scoping:

```toml
# In netlify.toml
[context.production.environment]
  ONLY_ESSENTIAL_VAR = "value"

[context.deploy-preview.environment]
  # Preview-specific vars
```

## Testing

After implementing fixes:

```bash
# Test locally first
npm run build

# Deploy to Netlify
git add .
git commit -m "fix: reduce environment variables for Lambda 4KB limit"
git push
```

## Additional Resources

- [Netlify Functions Environment Variables](https://docs.netlify.com/functions/configure-and-deploy/#environment-variables)
- [AWS Lambda Limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
