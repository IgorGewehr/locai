# Netlify Deployment Guide

## ✅ Pre-deployment Checklist

- [x] Removed all 238 console.log statements
- [x] Fixed hardcoded tenant IDs (using dynamic resolution)
- [x] Created netlify.toml configuration
- [x] Updated next.config.js (removed standalone output)
- [x] Created environment variables template

## 🚀 Quick Deploy Steps

### 1. Prepare Your Repository

```bash
# Create production branch
git checkout -b production
git add .
git commit -m "Prepare for Netlify deployment"
git push origin production
```

### 2. Deploy to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Branch**: `production`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Click "Deploy site"

### 3. Configure Environment Variables

In Netlify Dashboard > Site settings > Environment variables, add ALL variables from `.env.netlify.example`:

#### Critical Variables (MUST SET):
- `TENANT_ID` - Your tenant identifier
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `OPENAI_API_KEY` - Your OpenAI API key
- All Firebase variables (both client and admin)
- All WhatsApp variables

#### Generate Admin Password:
```bash
npm run generate-password-hash
# Follow prompts and copy the hash to ADMIN_PASSWORD_HASH
```

### 4. Configure WhatsApp Webhook

After deployment, in Meta Business Platform:
1. Set webhook URL: `https://your-app.netlify.app/api/webhook/whatsapp`
2. Set verify token: Same as `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to: `messages`, `message_status`

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-app.netlify.app/api/health
```

### 2. Test WhatsApp Webhook
```bash
curl "https://your-app.netlify.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
```

### 3. Test Login
```bash
curl -X POST https://your-app.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@your-domain.com","password":"your-password"}'
```

## ⚠️ Known Limitations on Netlify

1. **No WebSocket support** - Real-time features won't work
2. **26-second timeout** - Long AI requests may timeout
3. **No background jobs** - Use Netlify Scheduled Functions
4. **10MB request limit** - Large file uploads won't work

## 🔧 Troubleshooting

### Build Failing
- Check Node version (should be 20.x)
- Verify all environment variables are set
- Check build logs in Netlify dashboard

### WhatsApp Not Working
- Verify webhook URL is accessible
- Check WHATSAPP_VERIFY_TOKEN matches
- Review function logs in Netlify

### Firebase Connection Issues
- Ensure service account JSON is properly formatted
- Check Firebase project ID matches
- Verify Firestore rules allow access

### OpenAI Timeouts
- Consider reducing timeout to 20 seconds
- Implement response streaming if needed

## 📊 Monitoring

1. **Netlify Analytics** - Enable in dashboard
2. **Function Logs** - Dashboard > Functions > Logs
3. **Error Alerts** - Set up notifications in Netlify

## 🔄 Updating Your App

```bash
git checkout production
git pull origin main
git push origin production
```

Netlify will automatically redeploy on push.

## 🆘 Support Resources

- [Netlify Docs](https://docs.netlify.com)
- [Next.js on Netlify](https://docs.netlify.com/frameworks/next-js/)
- [Netlify Support](https://www.netlify.com/support/)

---

**Note**: This app was optimized for Netlify deployment from a server-based architecture. Some features may have reduced functionality compared to a traditional server deployment.