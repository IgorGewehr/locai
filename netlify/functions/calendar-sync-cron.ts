/**
 * Netlify Scheduled Function: Calendar Sync Cron
 *
 * Runs automatically every 12 hours to sync all active calendar configurations
 *
 * Netlify Scheduled Functions: https://docs.netlify.com/functions/scheduled-functions/
 */

import { schedule } from '@netlify/functions';

const CRON_SECRET = process.env.CRON_SECRET;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.URL;

export const handler = schedule('0 */12 * * *', async (event) => {
  console.log('Calendar sync cron job triggered at:', new Date().toISOString());

  try {
    // Call the Next.js API route
    const apiUrl = `${NEXT_PUBLIC_APP_URL}/api/calendar/sync/cron`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Calendar sync failed:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: 'Calendar sync failed',
          details: result,
        }),
      };
    }

    console.log('Calendar sync completed successfully:', result.summary);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Calendar sync cron job completed',
        result: result.summary,
      }),
    };
  } catch (error) {
    console.error('Error in calendar sync cron:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Cron job execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
});
