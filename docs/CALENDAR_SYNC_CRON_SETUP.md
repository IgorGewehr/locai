# Calendar Sync Cron Job Setup Guide

Complete guide to setting up automated 30-minute iCal synchronization for AlugaZap.

## 📋 Overview

This system automatically syncs calendars from external platforms (Airbnb, Booking, etc.) every 30 minutes to keep your AlugaZap reservations up to date.

**Architecture:**
- **Next.js App** (Netlify): `/api/calendar/sync/cron` endpoint
- **DigitalOcean Server**: Node.js cron script that calls the endpoint
- **Frequency**: Every 30 minutes
- **Security**: Bearer token authentication (`CRON_SECRET`)

---

## 🚀 Solution 1: DigitalOcean Server (RECOMMENDED)

**Pros:**
- ✅ Full control over execution
- ✅ No additional costs
- ✅ Easy monitoring via logs
- ✅ Already have DigitalOcean server for Baileys

**Cons:**
- ⚠️ Requires SSH access
- ⚠️ Manual setup needed

### Step 1: Prepare the Script

The script is already created at `scripts/cron-sync-calendars.js`.

**What it does:**
- Calls your Next.js API endpoint every 30 minutes
- Uses `CRON_SECRET` for authentication
- Logs detailed results with color-coded output
- Exits with proper status codes for cron monitoring

### Step 2: Copy Script to DigitalOcean Server

```bash
# From your local machine
scp scripts/cron-sync-calendars.js root@YOUR_SERVER_IP:/opt/alugazap/
```

Or manually:
1. SSH into your DigitalOcean server
2. Create directory: `mkdir -p /opt/alugazap`
3. Create the file: `nano /opt/alugazap/cron-sync-calendars.js`
4. Copy the contents from `scripts/cron-sync-calendars.js`
5. Save and exit (Ctrl+X, Y, Enter)

### Step 3: Set Executable Permission

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Make script executable
chmod +x /opt/alugazap/cron-sync-calendars.js
```

### Step 4: Create Environment File

```bash
# Create .env file for cron script
nano /opt/alugazap/.env
```

Add these variables:

```bash
# Production URL (IMPORTANT: Use your actual production domain)
NEXT_PUBLIC_APP_URL=https://www.alugazap.com

# Cron Secret (CRITICAL: Must match your Next.js .env CRON_SECRET)
CRON_SECRET=your_secret_token_here

# Optional: Logging level
LOG_LEVEL=info
```

**🔐 CRITICAL**: The `CRON_SECRET` must match the `CRON_SECRET` in your Netlify environment variables.

### Step 5: Install Dependencies

```bash
cd /opt/alugazap

# Install dotenv for environment variables
npm install dotenv
```

### Step 6: Test the Script Manually

Before setting up cron, test the script:

```bash
cd /opt/alugazap
node cron-sync-calendars.js
```

**Expected output:**

```
🚀 [2025-11-24T10:30:00.000Z] Starting calendar sync cron job...
📡 [2025-11-24T10:30:00.100Z] Calling: https://www.alugazap.com/api/calendar/sync/cron
✅ [2025-11-24T10:30:05.500Z] Calendar sync completed successfully!
📊 [2025-11-24T10:30:05.501Z] Summary:
   - Processed: 3
   - Success: 3
   - Failed: 0
   - Duration: 5500ms
```

### Step 7: Setup Crontab

```bash
# Edit crontab
crontab -e
```

Add this line (runs every 30 minutes):

```bash
# AlugaZap Calendar Sync - Every 30 minutes
*/30 * * * * cd /opt/alugazap && /usr/bin/node cron-sync-calendars.js >> /var/log/calendar-sync.log 2>&1
```

**Breakdown:**
- `*/30 * * * *` = Every 30 minutes
- `cd /opt/alugazap` = Change to script directory (for .env file)
- `/usr/bin/node` = Node.js path (verify with `which node`)
- `>> /var/log/calendar-sync.log` = Append logs to file
- `2>&1` = Capture errors too

### Step 8: Create Log File

```bash
# Create log file with proper permissions
sudo touch /var/log/calendar-sync.log
sudo chmod 644 /var/log/calendar-sync.log
```

### Step 9: Monitor the Logs

```bash
# Watch logs in real-time
tail -f /var/log/calendar-sync.log

# View last 50 lines
tail -n 50 /var/log/calendar-sync.log

# Search for errors
grep "❌" /var/log/calendar-sync.log

# View logs for today only
grep "$(date +%Y-%m-%d)" /var/log/calendar-sync.log
```

### Step 10: Setup Log Rotation (Recommended)

Prevent log file from growing too large:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/calendar-sync
```

Add this content:

```
/var/log/calendar-sync.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 root root
}
```

Save and test:

```bash
sudo logrotate -f /etc/logrotate.d/calendar-sync
```

---

## 🔄 Solution 2: Vercel Cron (Alternative)

**Note**: Requires Vercel Pro plan ($20/month) for intervals < 1 day.

The `vercel.cron.json` has been updated to 30 minutes:

```json
{
  "crons": [
    {
      "path": "/api/calendar/sync/cron",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

**Setup:**
1. Deploy to Vercel (not Netlify)
2. Upgrade to Pro plan
3. Deploy with cron configuration
4. Vercel automatically runs the endpoint

**Pros:**
- ✅ Zero maintenance
- ✅ Automatic retries
- ✅ Built-in monitoring

**Cons:**
- ❌ Requires $20/month Vercel Pro plan
- ❌ Requires switching from Netlify to Vercel

---

## 🌐 Solution 3: External Cron Service (Free Alternative)

If you prefer not to manage server cron jobs, use a free external service.

### Option A: cron-job.org (Recommended)

**Setup:**

1. Go to https://cron-job.org/en/
2. Create free account
3. Create new cron job with:
   - **URL**: `https://www.alugazap.com/api/calendar/sync/cron`
   - **Schedule**: `*/30 * * * *` (every 30 minutes)
   - **Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```

**Pros:**
- ✅ Free forever
- ✅ No server maintenance
- ✅ Email notifications on failures
- ✅ Web dashboard for monitoring

**Cons:**
- ⚠️ Depends on third-party service
- ⚠️ Less control over execution

### Option B: EasyCron (Alternative)

Similar to cron-job.org, free tier available at https://www.easycron.com/

---

## 🔐 Security Configuration

### Generate CRON_SECRET

If you don't have a `CRON_SECRET` yet:

```bash
# Generate secure random token (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Example output:
```
k8d9fj3k2lsdfj9324jklsdfj923jlksdf93
```

### Add to Netlify Environment Variables

1. Go to Netlify Dashboard
2. Site Settings → Environment Variables
3. Add new variable:
   - **Key**: `CRON_SECRET`
   - **Value**: Your generated token
   - **Scopes**: Production, Deploy previews, Branch deploys

### Add to DigitalOcean Server

Update `/opt/alugazap/.env`:

```bash
CRON_SECRET=k8d9fj3k2lsdfj9324jklsdfj923jlksdf93
```

**🔒 CRITICAL**: Both must match exactly!

---

## 🧪 Testing

### Test 1: Manual Script Execution

```bash
cd /opt/alugazap
node cron-sync-calendars.js
```

Should see:
- ✅ Green success messages
- 📊 Summary statistics
- Exit code 0

### Test 2: Authentication Test

```bash
# Should FAIL with 401 Unauthorized
curl -X POST https://www.alugazap.com/api/calendar/sync/cron

# Should SUCCEED with 200 OK
curl -X POST https://www.alugazap.com/api/calendar/sync/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Test 3: Monitor First Cron Run

After setting up crontab, wait 30 minutes and check:

```bash
tail -f /var/log/calendar-sync.log
```

Should see execution logs every 30 minutes.

### Test 4: Verify Reservations Imported

1. Add a test reservation in Airbnb
2. Wait up to 30 minutes
3. Check AlugaZap dashboard → Reservations
4. Should see new reservation with:
   - ✅ Client: "Reserva Externa - AIRBNB"
   - ✅ Status: Confirmed
   - ✅ Observations: Contains "Imported from airbnb"
   - ✅ External UID populated

---

## 🐛 Troubleshooting

### Issue: "CRON_SECRET environment variable is required"

**Cause**: `.env` file not found or missing variable.

**Fix:**
```bash
# Check if .env exists
ls -la /opt/alugazap/.env

# Verify content
cat /opt/alugazap/.env

# Ensure script runs from correct directory
cd /opt/alugazap && node cron-sync-calendars.js
```

### Issue: "Request timeout"

**Cause**: API endpoint taking too long (>2 minutes).

**Fix:**
- Check server resources
- Reduce number of properties to sync
- Increase timeout in script (line 29):
  ```javascript
  const TIMEOUT = 300000; // 5 minutes
  ```

### Issue: "Authentication failed - check CRON_SECRET"

**Cause**: CRON_SECRET mismatch between server and Netlify.

**Fix:**
```bash
# Server .env
cat /opt/alugazap/.env | grep CRON_SECRET

# Compare with Netlify environment variable
# They must match EXACTLY (case-sensitive, no spaces)
```

### Issue: Cron not executing

**Verify cron is running:**
```bash
# Check cron service status
sudo systemctl status cron

# View cron logs
grep CRON /var/log/syslog

# List all cron jobs
crontab -l
```

**Common issues:**
- Wrong node path: Use `which node` to find correct path
- Missing execute permission: `chmod +x cron-sync-calendars.js`
- Wrong working directory: Ensure `cd /opt/alugazap` in crontab

### Issue: Empty logs

**Cause**: Output not being captured.

**Fix:**
```bash
# Test log writing
echo "test" >> /var/log/calendar-sync.log

# Check permissions
ls -la /var/log/calendar-sync.log

# Should be: -rw-r--r-- root root
```

### Issue: High resource usage

**Symptoms:**
- Server CPU spikes every 30 minutes
- API endpoint takes >30 seconds

**Solutions:**
1. Reduce sync frequency to hourly: `0 * * * *`
2. Add delay between property syncs (already implemented in API)
3. Use `syncFrequency: 'manual'` for less critical properties
4. Increase server resources

---

## 📊 Monitoring Best Practices

### 1. Setup Health Checks

Add a monitoring service (optional):

**UptimeRobot** (Free):
- Monitor: `https://www.alugazap.com/api/health`
- Interval: 5 minutes
- Get alerts if site goes down

### 2. Review Logs Weekly

```bash
# Count successful syncs this week
grep "✅ Calendar sync completed" /var/log/calendar-sync.log | wc -l

# Count failed syncs
grep "❌" /var/log/calendar-sync.log | wc -l

# Average processing time
grep "Duration:" /var/log/calendar-sync.log | awk '{print $NF}' | sed 's/ms//' | awk '{sum+=$1; count++} END {print sum/count "ms"}'
```

### 3. Setup Alerts (Optional)

Create a wrapper script that sends email on failure:

```bash
#!/bin/bash
# /opt/alugazap/cron-sync-with-alerts.sh

cd /opt/alugazap
node cron-sync-calendars.js

if [ $? -ne 0 ]; then
  echo "Calendar sync failed at $(date)" | mail -s "AlugaZap Sync Failed" your@email.com
fi
```

Update crontab to use wrapper:
```bash
*/30 * * * * /opt/alugazap/cron-sync-with-alerts.sh >> /var/log/calendar-sync.log 2>&1
```

---

## 🔄 Maintenance

### Weekly Tasks

- ✅ Review logs for errors
- ✅ Check sync success rate
- ✅ Verify reservations importing correctly

### Monthly Tasks

- ✅ Review log file size
- ✅ Test CRON_SECRET still valid
- ✅ Check server disk space
- ✅ Update Node.js dependencies if needed

### Emergency Stop

If you need to temporarily stop syncing:

```bash
# Comment out cron job
crontab -e
# Add # before the line

# Or remove entirely
crontab -r

# Verify stopped
crontab -l
```

---

## 📚 Additional Resources

### Cron Schedule Examples

```bash
*/30 * * * *   # Every 30 minutes
0 * * * *      # Every hour at minute 0
0 */2 * * *    # Every 2 hours
0 0 * * *      # Daily at midnight
0 0 * * 0      # Weekly on Sunday at midnight
0 0 1 * *      # Monthly on the 1st at midnight
```

### API Endpoint Details

**Endpoint**: `/api/calendar/sync/cron`
- **Method**: POST
- **Auth**: Bearer token via `Authorization` header
- **Response**: JSON with sync results
- **Timeout**: 2 minutes (script) / 10 minutes (API)

**Success Response (200)**:
```json
{
  "success": true,
  "summary": {
    "totalProcessed": 3,
    "totalSuccess": 3,
    "totalFailed": 0
  },
  "results": [
    {
      "propertyId": "abc123",
      "success": true,
      "eventsImported": 2
    }
  ]
}
```

**Error Response (401)**:
```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```

---

## ✅ Quick Setup Checklist

### DigitalOcean Server Setup

- [ ] Copy script to `/opt/alugazap/cron-sync-calendars.js`
- [ ] Make executable: `chmod +x`
- [ ] Create `.env` with `NEXT_PUBLIC_APP_URL` and `CRON_SECRET`
- [ ] Install dependencies: `npm install dotenv`
- [ ] Test manually: `node cron-sync-calendars.js`
- [ ] Add to crontab: `*/30 * * * * ...`
- [ ] Create log file: `/var/log/calendar-sync.log`
- [ ] Setup logrotate
- [ ] Monitor first execution
- [ ] Verify reservation imported

### Netlify Environment

- [ ] Generate `CRON_SECRET` if not exists
- [ ] Add `CRON_SECRET` to Netlify environment variables
- [ ] Verify `NEXT_PUBLIC_APP_URL=https://www.alugazap.com`
- [ ] Deploy to production
- [ ] Test API endpoint with curl

---

## 🎯 Expected Results

After successful setup:

1. **Every 30 minutes**: Cron executes automatically
2. **Logs**: New entries in `/var/log/calendar-sync.log`
3. **Reservations**: New Airbnb bookings appear in dashboard
4. **Client**: Auto-created "Reserva Externa - AIRBNB"
5. **Status**: Reservations marked as "Confirmed"
6. **No Duplicates**: Same UID prevents re-import

---

## 📞 Support

If you encounter issues:

1. Check logs first: `tail -n 100 /var/log/calendar-sync.log`
2. Test manually: `node cron-sync-calendars.js`
3. Verify environment variables match
4. Check API endpoint is accessible
5. Review troubleshooting section above

---

**Last Updated**: 2025-11-24
**Script Version**: 1.0
**Compatible with**: Next.js 15, Node.js 18+
