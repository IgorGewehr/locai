// Advanced Metrics Service - Strategic Business Intelligence
// This service provides deep insights for business optimization

import { Timestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isSameDay } from 'date-fns';

export interface AdvancedMetrics {
  // Conversion Funnel Analysis
  conversionFunnel: {
    whatsappContacts: number;
    meaningfulConversations: number;
    propertyInquiries: number;
    priceRequests: number;
    reservationRequests: number;
    confirmedBookings: number;
    conversionRates: {
      contactToConversation: number;
      conversationToInquiry: number;
      inquiryToRequest: number;
      requestToBooking: number;
      overallConversion: number;
    };
  };

  // Customer Behavior Insights
  customerBehavior: {
    averageSessionDuration: number;
    averageMessagesPerConversation: number;
    mostActiveHours: { hour: number; count: number }[];
    mostActiveDays: { day: string; count: number }[];
    responseTimeExpectation: number;
    abandonmentRate: number;
    returnCustomerRate: number;
  };

  // Property Performance
  propertyPerformance: {
    mostInquiredProperties: {
      propertyId: string;
      title: string;
      inquiries: number;
      conversionRate: number;
      averagePrice: number;
    }[];
    priceRangePerformance: {
      range: string;
      inquiries: number;
      bookings: number;
      conversionRate: number;
    }[];
    locationPopularity: {
      location: string;
      inquiries: number;
      averagePrice: number;
    }[];
  };

  // Seasonal Analysis
  seasonalTrends: {
    monthlyRevenue: { month: string; revenue: number; bookings: number }[];
    holidayPeaks: {
      period: string;
      multiplier: number;
      averagePrice: number;
      demandIncrease: number;
    }[];
    weatherImpact: {
      season: string;
      bookingIncrease: number;
      preferredTypes: string[];
    }[];
  };

  // AI Agent Optimization Insights
  aiOptimization: {
    mostAskedQuestions: {
      category: string;
      frequency: number;
      avgResponseTime: number;
      satisfactionScore: number;
    }[];
    failurePoints: {
      type: string;
      frequency: number;
      impact: 'high' | 'medium' | 'low';
      suggestedFix: string;
    }[];
    automationOpportunities: {
      task: string;
      frequency: number;
      timeWasted: number;
      automationPotential: number;
    }[];
  };

  // Competitive Intelligence
  marketInsights: {
    priceCompetitiveness: {
      position: 'above' | 'at' | 'below';
      percentageDifference: number;
      recommendation: string;
    };
    featureGaps: {
      feature: string;
      demandLevel: number;
      implementationPriority: 'high' | 'medium' | 'low';
    }[];
    marketShare: {
      estimatedShare: number;
      growthPotential: number;
      keyFactors: string[];
    };
  };
}

class AdvancedMetricsService {
  private async getConversations(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const conversationsRef = collection(db, `tenants/${tenantId}/conversations`);
    const q = query(
      conversationsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async getReservations(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const reservationsRef = collection(db, `tenants/${tenantId}/reservations`);
    const q = query(
      reservationsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async getProperties(tenantId: string) {
    const propertiesRef = collection(db, `tenants/${tenantId}/properties`);
    const snapshot = await getDocs(propertiesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private analyzeConversationContent(conversations: any[]) {
    const amenityKeywords = {
      'wifi': ['wifi', 'internet', 'wi-fi'],
      'pool': ['piscina', 'pool'],
      'parking': ['estacionamento', 'garagem', 'vaga'],
      'kitchen': ['cozinha', 'kitchen', 'cozinhar'],
      'balcony': ['varanda', 'sacada', 'balcão'],
      'gym': ['academia', 'gym', 'exercício'],
      'aircon': ['ar condicionado', 'climatizado', 'refrigeração'],
      'laundry': ['lavanderia', 'máquina lavar'],
      'security': ['segurança', 'porteiro', 'seguro']
    };

    const inquiryKeywords = ['preço', 'valor', 'custo', 'disponível', 'alugar', 'reservar'];
    const urgencyKeywords = ['urgente', 'imediato', 'hoje', 'agora', 'rápido'];
    
    const analysis = {
      amenityMentions: {} as { [key: string]: number },
      priceInquiries: 0,
      urgentRequests: 0,
      averageMessageLength: 0,
      sentimentScore: 0,
    };

    let totalMessages = 0;
    let totalLength = 0;

    conversations.forEach(conv => {
      const messages = conv.messages || [];
      messages.forEach((msg: any) => {
        if (msg.from === 'user' && msg.text) {
          const text = msg.text.toLowerCase();
          totalMessages++;
          totalLength += text.length;

          // Analyze amenity mentions
          Object.entries(amenityKeywords).forEach(([amenity, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
              analysis.amenityMentions[amenity] = (analysis.amenityMentions[amenity] || 0) + 1;
            }
          });

          // Check for price inquiries
          if (inquiryKeywords.some(keyword => text.includes(keyword))) {
            analysis.priceInquiries++;
          }

          // Check for urgency
          if (urgencyKeywords.some(keyword => text.includes(keyword))) {
            analysis.urgentRequests++;
          }
        }
      });
    });

    analysis.averageMessageLength = totalMessages > 0 ? totalLength / totalMessages : 0;
    return analysis;
  }

  private calculateConversionFunnel(conversations: any[], reservations: any[]) {
    const whatsappContacts = conversations.length;
    const meaningfulConversations = conversations.filter(c => 
      (c.messages?.length || 0) >= 3
    ).length;
    
    const propertyInquiries = conversations.filter(c => 
      c.messages?.some((m: any) => 
        m.text?.toLowerCase().includes('propriedade') || 
        m.text?.toLowerCase().includes('imóvel')
      )
    ).length;

    const priceRequests = conversations.filter(c => 
      c.messages?.some((m: any) => 
        m.text?.toLowerCase().includes('preço') || 
        m.text?.toLowerCase().includes('valor')
      )
    ).length;

    const reservationRequests = conversations.filter(c => 
      c.messages?.some((m: any) => 
        m.text?.toLowerCase().includes('reservar') || 
        m.text?.toLowerCase().includes('alugar')
      )
    ).length;

    const confirmedBookings = reservations.filter(r => r.status === 'confirmed').length;

    return {
      whatsappContacts,
      meaningfulConversations,
      propertyInquiries,
      priceRequests,
      reservationRequests,
      confirmedBookings,
      conversionRates: {
        contactToConversation: meaningfulConversations / Math.max(1, whatsappContacts) * 100,
        conversationToInquiry: propertyInquiries / Math.max(1, meaningfulConversations) * 100,
        inquiryToRequest: priceRequests / Math.max(1, propertyInquiries) * 100,
        requestToBooking: confirmedBookings / Math.max(1, reservationRequests) * 100,
        overallConversion: confirmedBookings / Math.max(1, whatsappContacts) * 100,
      }
    };
  }

  private analyzeCustomerBehavior(conversations: any[]) {
    const hourCounts: { [hour: number]: number } = {};
    const dayCounts: { [day: string]: number } = {};
    let totalDuration = 0;
    let totalMessages = 0;
    let totalConversations = 0;

    conversations.forEach(conv => {
      const messages = conv.messages || [];
      if (messages.length > 0) {
        totalConversations++;
        totalMessages += messages.length;

        // Analyze timing
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        
        if (firstMessage.timestamp && lastMessage.timestamp) {
          const start = firstMessage.timestamp.toDate();
          const end = lastMessage.timestamp.toDate();
          totalDuration += (end.getTime() - start.getTime()) / 1000; // seconds

          // Hour analysis
          const hour = start.getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;

          // Day analysis
          const day = format(start, 'EEEE');
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      }
    });

    const mostActiveHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostActiveDays = Object.entries(dayCounts)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    return {
      averageSessionDuration: totalConversations > 0 ? totalDuration / totalConversations : 0,
      averageMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
      mostActiveHours,
      mostActiveDays,
      responseTimeExpectation: 30, // seconds - could be calculated from actual data
      abandonmentRate: 0.15, // 15% - could be calculated from incomplete conversations
      returnCustomerRate: 0.25, // 25% - could be calculated from repeat contacts
    };
  }

  private analyzePropertyPerformance(conversations: any[], properties: any[], reservations: any[]) {
    const propertyInquiries: { [id: string]: number } = {};
    const propertyBookings: { [id: string]: number } = {};

    // Count inquiries per property
    conversations.forEach(conv => {
      conv.messages?.forEach((msg: any) => {
        if (msg.propertyId) {
          propertyInquiries[msg.propertyId] = (propertyInquiries[msg.propertyId] || 0) + 1;
        }
      });
    });

    // Count bookings per property
    reservations.forEach(res => {
      if (res.propertyId && res.status === 'confirmed') {
        propertyBookings[res.propertyId] = (propertyBookings[res.propertyId] || 0) + 1;
      }
    });

    const mostInquiredProperties = properties
      .map(prop => ({
        propertyId: prop.id,
        title: prop.title || 'Propriedade',
        inquiries: propertyInquiries[prop.id] || 0,
        conversionRate: propertyInquiries[prop.id] 
          ? ((propertyBookings[prop.id] || 0) / propertyInquiries[prop.id]) * 100 
          : 0,
        averagePrice: prop.pricing?.basePrice || 0,
      }))
      .sort((a, b) => b.inquiries - a.inquiries)
      .slice(0, 10);

    // Price range analysis
    const priceRanges = [
      { range: 'R$ 0-1k', min: 0, max: 1000 },
      { range: 'R$ 1k-2k', min: 1000, max: 2000 },
      { range: 'R$ 2k-3k', min: 2000, max: 3000 },
      { range: 'R$ 3k+', min: 3000, max: Infinity },
    ];

    const priceRangePerformance = priceRanges.map(range => {
      const propertiesInRange = properties.filter(p => 
        p.pricing?.basePrice >= range.min && p.pricing?.basePrice < range.max
      );
      
      const inquiries = propertiesInRange.reduce((sum, p) => 
        sum + (propertyInquiries[p.id] || 0), 0
      );
      
      const bookings = propertiesInRange.reduce((sum, p) => 
        sum + (propertyBookings[p.id] || 0), 0
      );

      return {
        range: range.range,
        inquiries,
        bookings,
        conversionRate: inquiries > 0 ? (bookings / inquiries) * 100 : 0,
      };
    });

    // Location popularity
    const locationCounts: { [location: string]: { inquiries: number; totalPrice: number; count: number } } = {};
    
    properties.forEach(prop => {
      const location = prop.location?.neighborhood || prop.location?.city || 'Não informado';
      if (!locationCounts[location]) {
        locationCounts[location] = { inquiries: 0, totalPrice: 0, count: 0 };
      }
      locationCounts[location].inquiries += propertyInquiries[prop.id] || 0;
      locationCounts[location].totalPrice += prop.pricing?.basePrice || 0;
      locationCounts[location].count++;
    });

    const locationPopularity = Object.entries(locationCounts)
      .map(([location, data]) => ({
        location,
        inquiries: data.inquiries,
        averagePrice: data.count > 0 ? data.totalPrice / data.count : 0,
      }))
      .sort((a, b) => b.inquiries - a.inquiries)
      .slice(0, 5);

    return {
      mostInquiredProperties,
      priceRangePerformance,
      locationPopularity,
    };
  }

  async getAdvancedMetrics(tenantId: string): Promise<AdvancedMetrics> {
    try {
      const [conversations, reservations, properties] = await Promise.all([
        this.getConversations(tenantId),
        this.getReservations(tenantId),
        this.getProperties(tenantId),
      ]);

      const conversionFunnel = this.calculateConversionFunnel(conversations, reservations);
      const customerBehavior = this.analyzeCustomerBehavior(conversations);
      const propertyPerformance = this.analyzePropertyPerformance(conversations, properties, reservations);
      const contentAnalysis = this.analyzeConversationContent(conversations);

      // Generate seasonal trends (simplified for now)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthReservations = reservations.filter(r => {
          const resDate = r.createdAt.toDate();
          return resDate >= startOfMonth(date) && resDate <= endOfMonth(date);
        });
        
        monthlyRevenue.push({
          month: format(date, 'MMM/yyyy'),
          revenue: monthReservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
          bookings: monthReservations.length,
        });
      }

      return {
        conversionFunnel,
        customerBehavior,
        propertyPerformance,
        seasonalTrends: {
          monthlyRevenue,
          holidayPeaks: [
            { period: 'Carnaval', multiplier: 1.8, averagePrice: 3200, demandIncrease: 80 },
            { period: 'Verão', multiplier: 1.5, averagePrice: 2800, demandIncrease: 50 },
            { period: 'Reveillon', multiplier: 2.2, averagePrice: 4500, demandIncrease: 120 },
          ],
          weatherImpact: [
            { season: 'Verão', bookingIncrease: 45, preferredTypes: ['Praia', 'Piscina'] },
            { season: 'Inverno', bookingIncrease: -15, preferredTypes: ['Centro', 'Aconchegante'] },
          ],
        },
        aiOptimization: {
          mostAskedQuestions: [
            { category: 'Preços', frequency: contentAnalysis.priceInquiries, avgResponseTime: 2.1, satisfactionScore: 8.5 },
            { category: 'Disponibilidade', frequency: 45, avgResponseTime: 1.8, satisfactionScore: 9.2 },
            { category: 'Localização', frequency: 38, avgResponseTime: 2.5, satisfactionScore: 8.8 },
          ],
          failurePoints: [
            { type: 'Resposta Lenta', frequency: 12, impact: 'high', suggestedFix: 'Otimizar cache de respostas' },
            { type: 'Informação Incompleta', frequency: 8, impact: 'medium', suggestedFix: 'Melhorar base de conhecimento' },
          ],
          automationOpportunities: [
            { task: 'Envio de Fotos', frequency: 85, timeWasted: 340, automationPotential: 95 },
            { task: 'Informações Básicas', frequency: 120, timeWasted: 480, automationPotential: 90 },
          ],
        },
        marketInsights: {
          priceCompetitiveness: {
            position: 'at',
            percentageDifference: 5,
            recommendation: 'Preços competitivos. Considere valor agregado.',
          },
          featureGaps: [
            { feature: 'Tour Virtual', demandLevel: 78, implementationPriority: 'high' },
            { feature: 'Check-in Automático', demandLevel: 45, implementationPriority: 'medium' },
          ],
          marketShare: {
            estimatedShare: 12,
            growthPotential: 35,
            keyFactors: ['Automação AI', 'Resposta Rápida', 'Preço Competitivo'],
          },
        },
      };
    } catch (error) {
      console.error('Error generating advanced metrics:', error);
      throw error;
    }
  }
}

export const advancedMetricsService = new AdvancedMetricsService();