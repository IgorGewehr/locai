#!/usr/bin/env node
/**
 * Calendar Sync Cron Script - DigitalOcean Server
 *
 * Script to be run on DigitalOcean server every 30 minutes via crontab.
 * Calls the Next.js API endpoint to sync all active calendar configurations.
 *
 * Usage:
 *   node scripts/cron-sync-calendars.js
 *
 * Environment Variables Required:
 *   - NEXT_PUBLIC_APP_URL: Base URL of the Next.js app (e.g., https://www.alugazap.com)
 *   - CRON_SECRET: Secret token for authentication
 *   NEXT_PUBLIC_APP_URL=https://www.alugazap.com
 *   CRON_SECRET=k8d9fj3k2lsdfj9324jklsdfj923jlksdf93_A4B7C2
 *
 * Setup on DigitalOcean:
 *   1. Copy this script to your server
 *   2. Create .env file with required variables
 *   3. Add to crontab: */30 * * * * /usr/bin/node /path/to/cron-sync-calendars.js >> /var/log/calendar-sync.log 2>&1
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.alugazap.com';
const CRON_SECRET = process.env.CRON_SECRET;
const ENDPOINT = '/api/calendar/sync/cron';
const TIMEOUT = 120000; // 2 minutes timeout

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(TIMEOUT);
    req.end();
  });
}

async function syncCalendars() {
  const startTime = Date.now();

  try {
    log('🚀 Starting calendar sync cron job...', colors.blue);

    // Validate configuration
    if (!CRON_SECRET) {
      throw new Error('CRON_SECRET environment variable is required');
    }

    const url = `${API_URL}${ENDPOINT}`;
    log(`📡 Calling: ${url}`, colors.blue);

    // Make POST request to cron endpoint
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AlugaZap-Cron/1.0',
      },
    });

    const duration = Date.now() - startTime;

    // Handle response
    if (response.statusCode === 200 || response.statusCode === 201) {
      const result = response.body;

      log('✅ Calendar sync completed successfully!', colors.green);
      log(`📊 Summary:`, colors.bright);
      log(`   - Processed: ${result.summary?.totalProcessed || 0}`, colors.green);
      log(`   - Success: ${result.summary?.totalSuccess || 0}`, colors.green);
      log(`   - Failed: ${result.summary?.totalFailed || 0}`, result.summary?.totalFailed > 0 ? colors.yellow : colors.green);
      log(`   - Duration: ${duration}ms`, colors.blue);

      if (result.results && result.results.length > 0) {
        log(`\n📋 Results (first 10):`, colors.bright);
        result.results.slice(0, 10).forEach((r, index) => {
          const status = r.success ? '✓' : '✗';
          const statusColor = r.success ? colors.green : colors.red;
          log(`   ${index + 1}. ${status} Property ${r.propertyId}: ${r.eventsImported || 0} events`, statusColor);
        });
      }

      // Exit with success
      process.exit(0);

    } else if (response.statusCode === 401) {
      log('🔒 Authentication failed - check CRON_SECRET', colors.red);
      log('Response: ' + JSON.stringify(response.body, null, 2), colors.red);
      process.exit(1);

    } else {
      log(`❌ Sync failed with status ${response.statusCode}`, colors.red);
      log('Response: ' + JSON.stringify(response.body, null, 2), colors.red);
      process.exit(1);
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    log('❌ Calendar sync cron job failed!', colors.red);
    log(`Error: ${error.message}`, colors.red);
    log(`Duration: ${duration}ms`, colors.blue);

    if (error.stack) {
      log('Stack trace:', colors.red);
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the sync
syncCalendars();
