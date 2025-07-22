import { z } from 'zod';

// Base schemas
export const phoneNumberSchema = z.string()
  .min(10, 'Phone number too short')
  .max(15, 'Phone number too long')
  .regex(/^\d+$/, 'Phone number must contain only digits')
  .transform((phone) => {
    // Add Brazil country code if needed
    if (phone.length === 11) {
      return `55${phone}`;
    }
    return phone;
  });

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform(email => email.toLowerCase().trim());

export const uuidSchema = z.string()
  .uuid('Invalid ID format');

export const tenantIdSchema = z.string()
  .min(1, 'Tenant ID required')
  .max(50, 'Tenant ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid tenant ID format');

export const dateSchema = z.string()
  .datetime()
  .or(z.date())
  .transform((val) => new Date(val));

export const priceSchema = z.number()
  .positive('Price must be positive')
  .max(9999999, 'Price too high')
  .multipleOf(0.01, 'Price must have at most 2 decimal places');

// Property schemas
export const propertyCreateSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  location: z.object({
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
    country: z.string().default('BR'),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).optional(),
  }),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(10),
  capacity: z.number().int().min(1).max(50),
  area: z.number().positive().max(10000).optional(),
  amenities: z.array(z.string()).max(100).default([]),
  pricing: z.object({
    basePrice: priceSchema,
    weekendMultiplier: z.number().min(1).max(3).default(1.2),
    holidayMultiplier: z.number().min(1).max(5).default(1.5),
    seasonalRates: z.array(z.object({
      name: z.string(),
      startDate: dateSchema,
      endDate: dateSchema,
      multiplier: z.number().min(0.5).max(5),
    })).max(20).default([]),
  }),
  photos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().max(200).optional(),
    order: z.number().int().min(0).optional(),
  })).max(50).default([]),
  videos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().max(200).optional(),
  })).max(10).default([]),
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
  tenantId: tenantIdSchema,
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export const propertySearchSchema = z.object({
  checkIn: dateSchema.optional(),
  checkOut: dateSchema.optional(),
  guests: z.number().int().positive().max(50).optional(),
  minBedrooms: z.number().int().min(0).max(20).optional(),
  maxPrice: priceSchema.optional(),
  amenities: z.array(z.string()).max(50).optional(),
  city: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Reservation schemas
export const reservationCreateSchema = z.object({
  propertyId: uuidSchema,
  clientId: uuidSchema,
  checkIn: dateSchema,
  checkOut: dateSchema,
  guests: z.number().int().positive().max(50),
  pricing: z.object({
    basePrice: priceSchema,
    totalPrice: priceSchema,
    breakdown: z.array(z.object({
      date: dateSchema,
      price: priceSchema,
      type: z.string(),
    })).optional(),
  }),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('pending'),
  notes: z.string().max(1000).optional(),
  tenantId: tenantIdSchema,
});

export const reservationUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().max(1000).optional(),
  guests: z.number().int().positive().max(50).optional(),
});

// Client schemas
export const clientCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: emailSchema,
  phoneNumber: phoneNumberSchema,
  document: z.string().max(50).optional(),
  address: z.object({
    street: z.string().max(200),
    city: z.string().max(100),
    state: z.string().max(50),
    zipCode: z.string().max(20),
    country: z.string().max(2).default('BR'),
  }).optional(),
  preferences: z.object({
    amenities: z.array(z.string()).max(50).default([]),
    maxBudget: priceSchema.optional(),
    preferredLocations: z.array(z.string()).max(20).default([]),
  }).optional(),
  tags: z.array(z.string()).max(20).default([]),
  tenantId: tenantIdSchema,
});

export const clientUpdateSchema = clientCreateSchema.partial();

// Conversation schemas
export const conversationCreateSchema = z.object({
  phoneNumber: phoneNumberSchema,
  clientId: uuidSchema.optional(),
  status: z.enum(['active', 'paused', 'closed']).default('active'),
  context: z.object({
    searchCriteria: z.any().optional(),
    interestedProperties: z.array(uuidSchema).max(50).default([]),
    pendingReservation: z.any().optional(),
    lastIntent: z.string().optional(),
  }).optional(),
  tenantId: tenantIdSchema,
});

export const messageCreateSchema = z.object({
  conversationId: uuidSchema,
  content: z.string().min(1).max(4000).trim(),
  type: z.enum(['text', 'image', 'video', 'audio', 'document']).default('text'),
  direction: z.enum(['inbound', 'outbound']),
  metadata: z.object({
    mediaUrl: z.string().url().optional(),
    fileName: z.string().max(255).optional(),
    fileSize: z.number().positive().max(100000000).optional(), // 100MB max
    mimeType: z.string().max(100).optional(),
  }).optional(),
  status: z.enum(['sent', 'delivered', 'read', 'failed']).default('sent'),
  tenantId: tenantIdSchema,
});

// AI Agent schemas
export const aiAgentRequestSchema = z.object({
  message: z.string().min(1).max(4000).trim(),
  conversationId: uuidSchema,
  phoneNumber: phoneNumberSchema,
  tenantId: tenantIdSchema,
  context: z.any().optional(),
});

export const aiAgentConfigSchema = z.object({
  model: z.enum(['gpt-4o-mini']).default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(4000).default(1000),
  systemPrompt: z.string().max(2000).optional(),
  functionCalling: z.boolean().default(true),
  tenantId: tenantIdSchema,
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  metrics: z.array(z.enum([
    'totalRevenue',
    'totalReservations',
    'occupancyRate',
    'averageStayDuration',
    'conversationMetrics',
    'clientMetrics',
  ])).min(1).max(20),
  groupBy: z.enum(['day', 'week', 'month', 'property', 'client']).optional(),
  tenantId: tenantIdSchema,
});

// Goal schemas
export const goalCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  type: z.enum(['revenue', 'growth', 'efficiency', 'satisfaction']),
  category: z.enum(['financial', 'operational', 'customer', 'innovation']),
  metric: z.string().min(1).max(100),
  targetValue: z.number(),
  startValue: z.number().optional(),
  currentValue: z.number().optional(),
  period: z.object({
    start: dateSchema,
    end: dateSchema,
  }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  milestones: z.array(z.object({
    name: z.string().min(1).max(200),
    targetValue: z.number(),
    targetDate: dateSchema,
    completed: z.boolean().default(false),
  })).max(20).optional(),
  tags: z.array(z.string()).max(10).default([]),
  tenantId: tenantIdSchema,
});

export const goalUpdateSchema = goalCreateSchema.partial();

// WhatsApp webhook schema
export const whatsappWebhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string(),
        }),
        contacts: z.array(z.object({
          profile: z.object({
            name: z.string(),
          }),
          wa_id: z.string(),
        })).optional(),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          type: z.enum(['text', 'image', 'video', 'audio', 'document', 'location']),
          text: z.object({
            body: z.string(),
          }).optional(),
          image: z.object({
            id: z.string(),
            mime_type: z.string(),
            sha256: z.string(),
          }).optional(),
          video: z.object({
            id: z.string(),
            mime_type: z.string(),
            sha256: z.string(),
          }).optional(),
          audio: z.object({
            id: z.string(),
            mime_type: z.string(),
            sha256: z.string(),
          }).optional(),
          document: z.object({
            id: z.string(),
            mime_type: z.string(),
            sha256: z.string(),
            filename: z.string().optional(),
          }).optional(),
        })).optional(),
      }),
      field: z.string(),
    })),
  })),
});

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  tenantId: tenantIdSchema.optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1).max(200).trim(),
  phoneNumber: phoneNumberSchema.optional(),
  tenantId: tenantIdSchema.optional(),
  role: z.enum(['admin', 'agent', 'user']).default('user'),
});

export const passwordResetSchema = z.object({
  email: emailSchema,
  tenantId: tenantIdSchema.optional(),
});

export const passwordUpdateSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// Payment schemas
export const paymentCreateSchema = z.object({
  reservationId: uuidSchema,
  amount: priceSchema,
  method: z.enum(['credit_card', 'debit_card', 'pix', 'bank_transfer', 'cash']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']).default('pending'),
  installments: z.number().int().min(1).max(12).default(1),
  metadata: z.object({
    transactionId: z.string().optional(),
    gateway: z.string().optional(),
    pixKey: z.string().optional(),
    cardLast4: z.string().length(4).optional(),
    cardBrand: z.string().optional(),
  }).optional(),
  tenantId: tenantIdSchema,
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Query filter schema
export const queryFilterSchema = z.object({
  search: z.string().max(200).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  status: z.string().optional(),
  tenantId: tenantIdSchema,
}).merge(paginationSchema);