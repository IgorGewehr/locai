import { FirestoreService } from '@/lib/firebase/firestore';
import { 
  BillingSettings, 
  BillingReminder, 
  BillingCampaign,
  BillingTemplate,
  TransactionBillingStatus,
  DEFAULT_TEMPLATES
} from '@/lib/types/billing';
import { Transaction, Client } from '@/lib/types';
import { Property } from '@/lib/types/property';
import { transactionService } from './transaction-service';
import { clientService, propertyService } from '@/lib/firebase/firestore';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  format, 
  addDays, 
  isAfter, 
  isBefore, 
  differenceInDays,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  parseISO,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

class BillingService {
  private settingsService: FirestoreService<BillingSettings>;
  private reminderService: FirestoreService<BillingReminder>;
  private campaignService: FirestoreService<BillingCampaign>;

  constructor() {
    this.settingsService = new FirestoreService<BillingSettings>('billing_settings');
    this.reminderService = new FirestoreService<BillingReminder>('billing_reminders');
    this.campaignService = new FirestoreService<BillingCampaign>('billing_campaigns');
  }

  // Obter configurações de cobrança
  async getSettings(tenantId: string): Promise<BillingSettings | null> {
    const q = query(
      collection(db, 'billing_settings'),
      where('tenantId', '==', tenantId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as BillingSettings;
  }

  // Criar configurações padrão
  async createDefaultSettings(tenantId: string): Promise<BillingSettings> {
    const defaultSettings: Omit<BillingSettings, 'id'> = {
      tenantId,
      enabled: false,
      defaultReminderDays: 2,
      defaultOverdueDays: 1,
      maxReminders: 3,
      sendTimeStart: '09:00',
      sendTimeEnd: '18:00',
      workDays: [1, 2, 3, 4, 5], // seg-sex
      templates: {
        beforeDue: {
          id: 'before_due_default',
          name: 'Lembrete antes do vencimento',
          message: DEFAULT_TEMPLATES.beforeDue.friendly,
          tone: 'friendly',
          includePaymentLink: true,
          includeInvoice: false
        },
        onDue: {
          id: 'on_due_default',
          name: 'Lembrete no vencimento',
          message: DEFAULT_TEMPLATES.onDue.friendly,
          tone: 'friendly',
          includePaymentLink: true,
          includeInvoice: false
        },
        overdue: {
          id: 'overdue_default',
          name: 'Cobrança em atraso',
          message: DEFAULT_TEMPLATES.overdue.friendly,
          tone: 'friendly',
          includePaymentLink: true,
          includeInvoice: true
        },
        receipt: {
          id: 'receipt_default',
          name: 'Confirmação de pagamento',
          message: DEFAULT_TEMPLATES.receipt.friendly,
          tone: 'friendly',
          includePaymentLink: false,
          includeInvoice: true
        }
      },
      transactionTypes: {
        all: true,
        reservation: true,
        maintenance: true,
        cleaning: true,
        commission: true,
        other: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'billing_settings'), {
      ...defaultSettings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...defaultSettings
    };
  }

  // Processar lembretes programados
  async processScheduledReminders(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = getDay(now);

    // Buscar todos os lembretes programados para hoje
    const q = query(
      collection(db, 'billing_reminders'),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', Timestamp.fromDate(startOfDay(now))),
      where('scheduledDate', '<=', Timestamp.fromDate(endOfDay(now)))
    );

    const snapshot = await getDocs(q);
    const reminders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BillingReminder[];

    for (const reminder of reminders) {
      // Verificar configurações do tenant
      const settings = await this.getSettings(reminder.tenantId);
      if (!settings || !settings.enabled) continue;

      // Verificar horário de envio
      const [startHour] = settings.sendTimeStart.split(':').map(Number);
      const [endHour] = settings.sendTimeEnd.split(':').map(Number);
      
      if (currentHour < startHour || currentHour >= endHour) continue;

      // Verificar dia da semana
      if (!settings.workDays.includes(currentDay)) continue;

      // Enviar lembrete
      await this.sendReminder(reminder);
    }
  }

  // Enviar lembrete via WhatsApp
  async sendReminder(reminder: BillingReminder): Promise<void> {
    try {
      const [transaction, client, settings] = await Promise.all([
        transactionService.getById(reminder.transactionId),
        clientService.getById(reminder.clientId),
        this.getSettings(reminder.tenantId)
      ]);

      if (!transaction || !client || !settings) {
        throw new Error('Dados necessários não encontrados');
      }

      // Obter template apropriado
      let template: BillingTemplate;
      switch (reminder.type) {
        case 'before_due':
          template = settings.templates.beforeDue;
          break;
        case 'on_due':
          template = settings.templates.onDue;
          break;
        case 'overdue':
          template = settings.templates.overdue;
          break;
        default:
          throw new Error('Tipo de lembrete inválido');
      }

      // Preparar variáveis do template
      const property = transaction.propertyId 
        ? await propertyService.getById(transaction.propertyId)
        : null;

      const variables = {
        clientName: client.name,
        amount: this.formatCurrency(transaction.amount),
        dueDate: format(transaction.date, 'dd/MM/yyyy', { locale: ptBR }),
        propertyName: property?.name || 'N/A',
        period: transaction.description || 'N/A',
        paymentLink: `${process.env.NEXT_PUBLIC_APP_URL}/payment/${transaction.id}`,
        companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Imobiliária',
        updatedAmount: this.formatCurrency(this.calculateUpdatedAmount(transaction)),
        daysOverdue: Math.max(0, differenceInDays(new Date(), transaction.date))
      };

      // Substituir variáveis no template
      let message = template.message;
      Object.entries(variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });

      // Enviar via WhatsApp usando o agente
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          to: reminder.whatsappNumber,
          isSystemMessage: true,
          metadata: {
            type: 'billing_reminder',
            reminderId: reminder.id,
            transactionId: reminder.transactionId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }

      const result = await response.json();

      // Atualizar status do lembrete
      await updateDoc(doc(db, 'billing_reminders', reminder.id), {
        status: 'sent',
        sentAt: serverTimestamp(),
        whatsappMessageId: result.messageId,
        updatedAt: serverTimestamp()
      });

      // Registrar no histórico da transação
      await this.updateTransactionBillingStatus(reminder.transactionId, {
        lastReminderSentAt: new Date(),
        remindersSent: (await this.getTransactionBillingStatus(reminder.transactionId))?.reminders.sent + 1 || 1
      });

    } catch (error) {
      // TODO: Add proper logging - Erro ao enviar lembrete;
      
      // Atualizar status para falha
      await updateDoc(doc(db, 'billing_reminders', reminder.id), {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        attemptCount: reminder.attemptCount + 1,
        lastAttemptAt: serverTimestamp(),
        nextRetryAt: reminder.attemptCount < 3 
          ? Timestamp.fromDate(addDays(new Date(), 1))
          : null,
        updatedAt: serverTimestamp()
      });
    }
  }

  // Criar lembretes para transações pendentes
  async createRemindersForPendingTransactions(): Promise<void> {
    const tenants = await this.getAllTenantsWithBillingEnabled();
    
    for (const tenantId of tenants) {
      const settings = await this.getSettings(tenantId);
      if (!settings || !settings.enabled) continue;

      // Buscar transações pendentes
      const transactions = await transactionService.getFiltered({
        status: 'pending',
        type: 'income'
      });

      for (const transaction of transactions.transactions) {
        // Verificar se o tipo de transação está habilitado
        if (!settings.transactionTypes.all && 
            !settings.transactionTypes[transaction.category as keyof typeof settings.transactionTypes]) {
          continue;
        }

        // Verificar se já existem lembretes
        const existingReminders = await this.getRemindersForTransaction(transaction.id);
        if (existingReminders.length >= settings.maxReminders) continue;

        const now = new Date();
        const dueDate = transaction.date;
        const daysUntilDue = differenceInDays(dueDate, now);

        // Criar lembrete antes do vencimento
        if (daysUntilDue === settings.defaultReminderDays && 
            !existingReminders.some(r => r.type === 'before_due')) {
          await this.createReminder({
            transactionId: transaction.id,
            clientId: transaction.clientId!,
            type: 'before_due',
            scheduledDate: this.getNextSendTime(settings),
            daysFromDue: -settings.defaultReminderDays
          });
        }

        // Criar lembrete no vencimento
        if (daysUntilDue === 0 && 
            !existingReminders.some(r => r.type === 'on_due')) {
          await this.createReminder({
            transactionId: transaction.id,
            clientId: transaction.clientId!,
            type: 'on_due',
            scheduledDate: this.getNextSendTime(settings),
            daysFromDue: 0
          });
        }

        // Criar lembrete após vencimento
        if (daysUntilDue === -settings.defaultOverdueDays && 
            !existingReminders.some(r => r.type === 'overdue')) {
          await this.createReminder({
            transactionId: transaction.id,
            clientId: transaction.clientId!,
            type: 'overdue',
            scheduledDate: this.getNextSendTime(settings),
            daysFromDue: settings.defaultOverdueDays
          });
        }
      }
    }
  }

  // Criar lembrete individual
  async createReminder(data: {
    transactionId: string;
    clientId: string;
    type: 'before_due' | 'on_due' | 'overdue';
    scheduledDate: Date;
    daysFromDue: number;
  }): Promise<string> {
    const client = await clientService.getById(data.clientId);
    if (!client || !client.whatsappNumber) {
      throw new Error('Cliente sem WhatsApp cadastrado');
    }

    const reminder: Omit<BillingReminder, 'id'> = {
      tenantId: client.tenantId || '',
      transactionId: data.transactionId,
      clientId: data.clientId,
      type: data.type,
      scheduledDate: data.scheduledDate,
      daysFromDue: data.daysFromDue,
      status: 'scheduled',
      whatsappNumber: client.whatsappNumber,
      attemptCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'billing_reminders'), {
      ...reminder,
      scheduledDate: Timestamp.fromDate(data.scheduledDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  }

  // Obter lembretes de uma transação
  async getRemindersForTransaction(transactionId: string): Promise<BillingReminder[]> {
    const q = query(
      collection(db, 'billing_reminders'),
      where('transactionId', '==', transactionId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BillingReminder[];
  }

  // Obter lembretes ativos para um número de telefone
  async getActiveRemindersForPhone(phoneNumber: string): Promise<BillingReminder[]> {
    const q = query(
      collection(db, 'billing_reminders'),
      where('whatsappNumber', '==', phoneNumber),
      where('status', 'in', ['sent', 'scheduled'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BillingReminder[];
  }

  // Processar resposta do cliente
  async processClientResponse(whatsappNumber: string, message: string, sentiment: 'positive' | 'negative' | 'neutral'): Promise<void> {
    // Buscar último lembrete enviado para este número
    const q = query(
      collection(db, 'billing_reminders'),
      where('whatsappNumber', '==', whatsappNumber),
      where('status', '==', 'sent')
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    // Ordenar por data de envio e pegar o mais recente
    const reminders = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => b.sentAt?.seconds - a.sentAt?.seconds) as BillingReminder[];

    const latestReminder = reminders[0];

    // Atualizar lembrete com a resposta
    await updateDoc(doc(db, 'billing_reminders', latestReminder.id), {
      clientResponse: {
        message,
        timestamp: serverTimestamp(),
        sentiment
      },
      updatedAt: serverTimestamp()
    });

    // Verificar se é confirmação de pagamento
    const paymentKeywords = ['paguei', 'pago', 'pagamento', 'realizado', 'transferi', 'transferido', 'comprovante', 'pix'];
    const messageNormalized = message.toLowerCase();
    const isPaymentConfirmation = paymentKeywords.some(keyword => messageNormalized.includes(keyword));

    if (sentiment === 'positive' && isPaymentConfirmation) {
      // Cliente confirmou pagamento - marcar transação como paga
      try {
        await transactionService.confirmTransaction(latestReminder.transactionId, 'client_confirmation');
        
        // Enviar confirmação de recebimento
        const transaction = await transactionService.getById(latestReminder.transactionId);
        const settings = await this.getSettings(latestReminder.tenantId);
        
        if (transaction && settings?.templates.receipt) {
          const client = await clientService.getById(latestReminder.clientId);
          const property = transaction.propertyId 
            ? await propertyService.getById(transaction.propertyId)
            : null;

          const variables = {
            clientName: client?.name || 'Cliente',
            amount: this.formatCurrency(transaction.amount),
            propertyName: property?.name || 'N/A',
            period: transaction.description || 'N/A',
            paymentDate: format(new Date(), 'dd/MM/yyyy'),
            companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Imobiliária'
          };

          // Substituir variáveis no template de recibo
          let receiptMessage = settings.templates.receipt.message;
          Object.entries(variables).forEach(([key, value]) => {
            receiptMessage = receiptMessage.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
          });

          // Enviar mensagem de confirmação
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: receiptMessage,
              to: whatsappNumber,
              isSystemMessage: true,
              metadata: {
                type: 'payment_receipt',
                transactionId: latestReminder.transactionId
              }
            })
          });
        }
      } catch (error) {
        console.error('Erro ao processar confirmação de pagamento:', error);
      }
      
      await this.updateTransactionBillingStatus(latestReminder.transactionId, {
        lastClientResponse: {
          message,
          timestamp: new Date(),
          sentiment,
          promisedPaymentDate: this.extractDateFromMessage(message)
        },
        isPaid: true
      });
    } else if (sentiment === 'positive' && message.toLowerCase().includes('pag')) {
      // Cliente mencionou pagamento mas não confirmou - pode ser promessa
      await this.updateTransactionBillingStatus(latestReminder.transactionId, {
        lastClientResponse: {
          message,
          timestamp: new Date(),
          sentiment,
          promisedPaymentDate: this.extractDateFromMessage(message)
        }
      });
    }
  }

  // Criar campanha de cobrança
  async createCampaign(data: Omit<BillingCampaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<string> {
    const campaign: Omit<BillingCampaign, 'id'> = {
      ...data,
      stats: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        responded: 0,
        paid: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'billing_campaigns'), {
      ...campaign,
      scheduledDate: Timestamp.fromDate(data.scheduledDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  }

  // Funções auxiliares
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  private calculateUpdatedAmount(transaction: Transaction): number {
    const daysOverdue = Math.max(0, differenceInDays(new Date(), transaction.date));
    const fineRate = 0.02; // 2% de multa
    const interestRate = 0.01 / 30; // 1% ao mês
    
    const fine = daysOverdue > 0 ? transaction.amount * fineRate : 0;
    const interest = transaction.amount * interestRate * daysOverdue;
    
    return transaction.amount + fine + interest;
  }

  private getNextSendTime(settings: BillingSettings): Date {
    const now = new Date();
    const [startHour, startMinute] = settings.sendTimeStart.split(':').map(Number);
    
    let nextSendTime = setMinutes(setHours(now, startHour), startMinute);
    
    // Se já passou do horário hoje, agendar para amanhã
    if (isAfter(now, nextSendTime)) {
      nextSendTime = addDays(nextSendTime, 1);
    }
    
    // Verificar se é dia útil
    while (!settings.workDays.includes(getDay(nextSendTime))) {
      nextSendTime = addDays(nextSendTime, 1);
    }
    
    return nextSendTime;
  }

  private async getAllTenantsWithBillingEnabled(): Promise<string[]> {
    const q = query(
      collection(db, 'billing_settings'),
      where('enabled', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().tenantId);
  }

  private async getTransactionBillingStatus(transactionId: string): Promise<TransactionBillingStatus | null> {
    const reminders = await this.getRemindersForTransaction(transactionId);
    
    if (reminders.length === 0) return null;
    
    const sentReminders = reminders.filter(r => r.status === 'sent');
    const scheduledReminders = reminders.filter(r => r.status === 'scheduled');
    
    return {
      transactionId,
      reminders: {
        scheduled: scheduledReminders.length,
        sent: sentReminders.length,
        lastSentAt: sentReminders.length > 0 
          ? sentReminders.sort((a, b) => b.sentAt!.getTime() - a.sentAt!.getTime())[0].sentAt 
          : undefined,
        nextScheduledAt: scheduledReminders.length > 0
          ? scheduledReminders.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0].scheduledDate
          : undefined
      },
      lastClientResponse: reminders.find(r => r.clientResponse)?.clientResponse as any,
      isOverdue: false, // Será calculado baseado na transação
      isPaid: false, // Será calculado baseado na transação
      stopReminders: false
    };
  }

  private async updateTransactionBillingStatus(transactionId: string, updates: Partial<TransactionBillingStatus>): Promise<void> {
    // Esta função seria implementada para manter um registro do status de cobrança
    // Por enquanto, vamos apenas registrar no console
    // TODO: Add proper logging - Atualizando status de cobrança;
  }

  private extractDateFromMessage(message: string): Date | undefined {
    // Implementação simplificada - em produção, usar NLP mais sofisticado
    const patterns = [
      /(\d{1,2})\/(\d{1,2})/,
      /amanhã/i,
      /próxima? (segunda|terça|quarta|quinta|sexta)/i
    ];
    
    // Por enquanto, retornar undefined
    return undefined;
  }

  // Configuração simplificada para pequenos proprietários
  async setupSimpleBilling(tenantId: string, config: {
    reminderDays: '1_day' | '2_days' | '3_days' | '7_days';
    tone: 'formal' | 'friendly';
    autoSend: boolean;
  }): Promise<void> {
    const reminderDaysMap = {
      '1_day': 1,
      '2_days': 2,
      '3_days': 3,
      '7_days': 7
    };

    const settings = await this.getSettings(tenantId) || await this.createDefaultSettings(tenantId);
    
    await updateDoc(doc(db, 'billing_settings', settings.id), {
      enabled: true,
      defaultReminderDays: reminderDaysMap[config.reminderDays],
      templates: {
        beforeDue: {
          ...settings.templates.beforeDue,
          message: DEFAULT_TEMPLATES.beforeDue[config.tone],
          tone: config.tone
        },
        onDue: {
          ...settings.templates.onDue,
          message: DEFAULT_TEMPLATES.onDue[config.tone],
          tone: config.tone
        },
        overdue: {
          ...settings.templates.overdue,
          message: DEFAULT_TEMPLATES.overdue[config.tone],
          tone: config.tone
        },
        receipt: {
          ...settings.templates.receipt,
          message: DEFAULT_TEMPLATES.receipt[config.tone],
          tone: config.tone
        }
      },
      updatedAt: serverTimestamp()
    });
  }
}

export const billingService = new BillingService();