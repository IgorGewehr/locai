/**
 * Facebook/Meta API Constants
 *
 * Centralized configuration for all Facebook/Instagram API interactions.
 * Update GRAPH_API_VERSION when Meta releases new versions.
 */

// Current stable Graph API version
// Meta typically deprecates versions 2 years after release
// Check: https://developers.facebook.com/docs/graph-api/changelog
export const GRAPH_API_VERSION = 'v21.0';

// Base URLs
export const GRAPH_API_BASE_URL = 'https://graph.facebook.com';
export const INSTAGRAM_API_BASE_URL = 'https://graph.instagram.com';
export const FACEBOOK_OAUTH_BASE_URL = 'https://www.facebook.com';
export const INSTAGRAM_OAUTH_BASE_URL = 'https://api.instagram.com';

// Constructed URLs
export const getGraphApiUrl = (endpoint: string) =>
  `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${endpoint}`;

export const getInstagramApiUrl = (endpoint: string) =>
  `${INSTAGRAM_API_BASE_URL}/${endpoint}`;

// OAuth Scopes
export const FACEBOOK_OAUTH_SCOPES = [
  'pages_show_list',        // List pages user manages
  'pages_messaging',        // Send/receive messages on Pages
  'pages_manage_metadata',  // Subscribe to webhooks
  'instagram_basic',        // Instagram account info
  'instagram_manage_messages', // Instagram DMs
];

export const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_business_basic',           // Basic profile info
  'instagram_business_manage_messages', // DMs - send and receive
  'instagram_business_manage_comments', // Comments management
];

// Webhook subscription fields
export const WEBHOOK_SUBSCRIPTION_FIELDS = [
  'messages',           // Incoming messages
  'messaging_postbacks', // Quick reply/button clicks
  'messaging_optins',   // User opt-ins
  'message_deliveries', // Delivery receipts
  'message_reads',      // Read receipts
];

// Token configuration
export const TOKEN_REFRESH_THRESHOLD_DAYS = 30; // Refresh if expires in less than 30 days
export const LONG_LIVED_TOKEN_DURATION_DAYS = 60; // Facebook long-lived tokens last 60 days

// Retry configuration for webhook processing
export const WEBHOOK_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30,     // 30 requests per minute per tenant
};

// Cache configuration
export const CACHE_CONFIG = {
  tenantLookupTtlMs: 5 * 60 * 1000, // 5 minutes
};

// Message types supported
export const SUPPORTED_ATTACHMENT_TYPES = [
  'image',
  'video',
  'audio',
  'file',
  'location',
  'share',
] as const;

export type AttachmentType = typeof SUPPORTED_ATTACHMENT_TYPES[number];
