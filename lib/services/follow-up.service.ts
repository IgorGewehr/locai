import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import whatsappService from '@/lib/services/whatsapp';
import { Timestamp } from 'firebase/firestore';

interface FollowUpConfig {
  delay: number; // minutos
  message: string;
  condition?: (conversation: any) => boolean;
}

export class FollowUpService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  private followUps: FollowUpConfig[] = [
    {
      delay: 30, // 30 minutos
      message: "Oi! 👋 Vi que você estava olhando nossos imóveis! Consegui um desconto EXCLUSIVO de 15% válido até meia-noite! Quer aproveitar? 🎯",
      condition: (conv) => !conv.hasReservation && conv.interestedProperties?.length > 0
    },
    {
      delay: 120, // 2 horas
      message: "⏰ ÚLTIMA CHANCE do desconto de 15%! Já tive mais 3 consultas sobre os imóveis que você viu. Posso garantir o seu agora?",
      condition: (conv) => !conv.hasReservation && conv.stage !== 'cold'
    },
    {
      delay: 1440, // 24 horas
      message: "Oi! Voltou! 😊 Que bom! Os imóveis que você viu ontem tiveram MUITA procura. Mas consegui segurar 1 pra você com 20% OFF! Aproveita?",
      condition: (conv) => !conv.hasReservation
    },
    {
      delay: 4320, // 3 dias
      message: "🎁 OFERTA EXCLUSIVA! Como você demonstrou interesse, consegui 25% de desconto + café da manhã GRÁTIS! Mas é só hoje. Vamos fechar? 🔥",
      condition: (conv) => !conv.hasReservation
    }
  ];

  private scheduledJobs: Map<string, NodeJS.Timeout[]> = new Map();

  /**
   * Agenda follow-ups para uma conversa
   */
  async scheduleFollowUps(conversationId: string, clientPhone: string) {
    // Cancela follow-ups anteriores
    this.cancelFollowUps(conversationId);

    const jobs: NodeJS.Timeout[] = [];

    for (const followUp of this.followUps) {
      const job = setTimeout(async () => {
        try {
          // Verifica condições antes de enviar
          const services = new TenantServiceFactory(this.tenantId);
          const conversation = await services.conversations.getById(conversationId);
          if (!conversation || conversation.hasReservation) {
            return; // Não enviar se já tem reserva
          }

          if (followUp.condition && !followUp.condition(conversation)) {
            return; // Condição não atendida
          }

          // Envia mensagem de follow-up
          await this.sendFollowUp(conversationId, clientPhone, followUp.message);

        } catch (error) {
          console.error('Erro ao enviar follow-up:', error);
        }
      }, followUp.delay * 60 * 1000); // Converte minutos para ms

      jobs.push(job);
    }

    this.scheduledJobs.set(conversationId, jobs);
  }

  /**
   * Envia mensagem de follow-up
   */
  private async sendFollowUp(conversationId: string, clientPhone: string, message: string) {
    try {
      const services = new TenantServiceFactory(this.tenantId);

      // Salva mensagem no banco
      await services.messages.create({
        conversationId,
        from: 'agent',
        content: message,
        messageType: 'text',
        timestamp: new Date(),
        isRead: false,
        isFollowUp: true
      });

      // Envia via WhatsApp
      await whatsappService.sendTextMessage(clientPhone, message);

      // Atualiza conversa
      await services.conversations.update(conversationId, {
        lastFollowUpAt: new Date(),
        followUpCount: Timestamp.now()
      });

      console.log(`Follow-up enviado para ${clientPhone}: ${message.substring(0, 50)}...`);

    } catch (error) {
      console.error('Erro ao enviar follow-up:', error);
    }
  }

  /**
   * Cancela follow-ups agendados
   */
  cancelFollowUps(conversationId: string) {
    const jobs = this.scheduledJobs.get(conversationId);
    if (jobs) {
      jobs.forEach(job => clearTimeout(job));
      this.scheduledJobs.delete(conversationId);
    }
  }

  /**
   * Cancela todos os follow-ups quando uma reserva é criada
   */
  async onReservationCreated(conversationId: string) {
    this.cancelFollowUps(conversationId);
    
    const services = new TenantServiceFactory(this.tenantId);
    
    // Marca conversa como tendo reserva
    await services.conversations.update(conversationId, {
      hasReservation: true,
      reservationCreatedAt: new Date()
    });
  }

  /**
   * Retorna estatísticas de follow-up
   */
  getStats() {
    return {
      activeFollowUps: this.scheduledJobs.size,
      totalScheduled: Array.from(this.scheduledJobs.values())
        .reduce((sum, jobs) => sum + jobs.length, 0)
    };
  }

  /**
   * Mensagens de follow-up otimizadas por horário
   */
  getOptimizedMessage(baseMessage: string): string {
    const hour = new Date().getHours();
    
    if (hour >= 7 && hour < 12) {
      return `Bom dia! ☀️ ${baseMessage}`;
    } else if (hour >= 12 && hour < 18) {
      return `Boa tarde! 🌤️ ${baseMessage}`;
    } else if (hour >= 18 && hour < 22) {
      return `Boa noite! 🌙 ${baseMessage}`;
    }
    
    // Não enviar follow-ups muito tarde/cedo
    return null;
  }
}

/**
 * Factory function to create tenant-aware follow-up service
 */
export function createFollowUpService(tenantId: string): FollowUpService {
  return new FollowUpService(tenantId);
}