/**
 * AGENT SETTINGS API ROUTE
 *
 * Manages AI agent configuration for tenant
 * Path: tenants/{tenantId}/config/agent-settings
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Validation schema
const AgentSettingsSchema = z.object({
  tone: z.enum(['formal', 'casual', 'friendly']),
  tagline: z.string().max(200).optional(),
  specialInstructions: z.string().max(2000).optional(),
  customRules: z.array(z.string().max(300)).max(10),
  autoReplyMessage: z.string().max(500).optional(),
});

type AgentSettings = z.infer<typeof AgentSettingsSchema>;

// Default agent settings
const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  tone: 'friendly',
  tagline: '',
  specialInstructions: '',
  customRules: [],
  autoReplyMessage: '',
};

/**
 * GET /api/tenant/settings/agent
 *
 * Returns current agent settings for authenticated tenant
 */
export async function GET(request: NextRequest) {
  const requestId = `get-agent-settings_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    // Authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    // Load settings from Firestore with fallback
    let agentSettings: AgentSettings;

    try {
      const services = new TenantServiceFactory(tenantId);
      const docRef = doc(services.db, 'tenants', tenantId, 'config', 'agent-settings');
      const settingsDoc = await getDoc(docRef);

      if (settingsDoc.exists()) {
        const data = settingsDoc.data();

        // Merge with defaults to ensure all required fields exist
        agentSettings = {
          ...DEFAULT_AGENT_SETTINGS,
          ...data,
          tone: data.tone || DEFAULT_AGENT_SETTINGS.tone,
          customRules: Array.isArray(data.customRules) ? data.customRules : DEFAULT_AGENT_SETTINGS.customRules,
        } as AgentSettings;
      } else {
        // Return default settings if doesn't exist
        agentSettings = DEFAULT_AGENT_SETTINGS;
      }
    } catch (firestoreError) {
      // Fallback to defaults if Firestore fails
      logger.error(
        '[GET-AGENT-SETTINGS] Firestore error - using defaults',
        firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError))
      );
      agentSettings = DEFAULT_AGENT_SETTINGS;
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: agentSettings,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error(
      '[GET-AGENT-SETTINGS] Request failed',
      error instanceof Error ? error : new Error(String(error)),
      { processingTime: `${processingTime}ms` }
    );

    // Return error with fallback data to prevent UI crash
    return NextResponse.json({
      success: false,
      error: 'Failed to load agent settings',
      data: DEFAULT_AGENT_SETTINGS,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        fallback: true,
        errorType: 'FIRESTORE_ERROR',
      },
    }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/settings/agent
 *
 * Updates agent settings for authenticated tenant
 */
export async function PUT(request: NextRequest) {
  const requestId = `update-agent-settings_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    // Authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    // Parse and validate body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    const validation = AgentSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const agentSettings = validation.data;

    // Sanitize text inputs
    const sanitizedSettings: AgentSettings = {
      ...agentSettings,
      tagline: agentSettings.tagline ? sanitizeUserInput(agentSettings.tagline) : '',
      specialInstructions: agentSettings.specialInstructions ? sanitizeUserInput(agentSettings.specialInstructions) : '',
      customRules: agentSettings.customRules.map((rule) => sanitizeUserInput(rule)),
      autoReplyMessage: agentSettings.autoReplyMessage ? sanitizeUserInput(agentSettings.autoReplyMessage) : '',
    };

    // Save to Firestore
    const services = new TenantServiceFactory(tenantId);
    const docRef = doc(services.db, 'tenants', tenantId, 'config', 'agent-settings');

    try {
      await setDoc(docRef, {
        ...sanitizedSettings,
        updatedAt: serverTimestamp(),
        updatedBy: authContext.userId || 'system',
      }, { merge: true });
    } catch (firestoreError) {
      logger.error(
        '[UPDATE-AGENT-SETTINGS] Firestore save failed',
        firestoreError instanceof Error ? firestoreError : new Error(String(firestoreError))
      );
      throw new Error('Failed to save agent settings to database');
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Agent settings updated successfully',
      data: sanitizedSettings,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error(
      '[UPDATE-AGENT-SETTINGS] Request failed',
      error instanceof Error ? error : new Error(String(error)),
      { processingTime: `${processingTime}ms` }
    );

    return handleApiError(error);
  }
}
