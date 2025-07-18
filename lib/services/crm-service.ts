import { FirestoreService } from '@/lib/firebase/firestore';
import { 
  Lead, 
  LeadStatus, 
  Interaction, 
  Task, 
  TaskStatus,
  LeadActivity,
  AILeadScoring,
  InteractionType,
  LeadSource
} from '@/lib/types/crm';
import { Client } from '@/lib/types';
import { 
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { differenceInDays, addDays } from 'date-fns';
import { conversationService } from '@/lib/firebase/firestore';

class CRMService {
  private leadService: FirestoreService<Lead>;
  private interactionService: FirestoreService<Interaction>;
  private taskService: FirestoreService<Task>;
  private activityService: FirestoreService<LeadActivity>;

  constructor() {
    this.leadService = new FirestoreService<Lead>('crm_leads');
    this.interactionService = new FirestoreService<Interaction>('crm_interactions');
    this.taskService = new FirestoreService<Task>('crm_tasks');
    this.activityService = new FirestoreService<LeadActivity>('crm_activities');
  }

  // =============== LEAD MANAGEMENT ===============

  async createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    // Check for duplicates by phone
    const existingLead = await this.getLeadByPhone(data.phone);
    if (existingLead) {
      // Update existing lead instead
      return this.updateLead(existingLead.id, data);
    }

    const lead: Omit<Lead, 'id'> = {
      ...data,
      status: data.status || LeadStatus.NEW,
      score: data.score || 50,
      temperature: data.temperature || 'warm',
      totalInteractions: 0,
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      firstContactDate: new Date(),
      lastContactDate: new Date()
    };

    const docRef = await addDoc(collection(db, 'crm_leads'), {
      ...lead,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const createdLead = { id: docRef.id, ...lead } as Lead;

    // Create initial activity
    await this.createActivity({
      leadId: docRef.id,
      type: 'status_change',
      description: `Lead criado via ${data.source}`,
      metadata: { source: data.source },
      userId: data.assignedTo || 'system'
    });

    // Run AI scoring
    await this.calculateLeadScore(createdLead);

    return createdLead;
  }

  async updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead> {
    const lead = await this.leadService.getById(leadId);
    if (!lead) throw new Error('Lead não encontrado');

    const oldStatus = lead.status;
    
    await updateDoc(doc(db, 'crm_leads', leadId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Track status changes
    if (updates.status && updates.status !== oldStatus) {
      await this.createActivity({
        leadId,
        type: 'status_change',
        description: `Status alterado de ${oldStatus} para ${updates.status}`,
        metadata: { oldStatus, newStatus: updates.status },
        userId: 'system'
      });

      // Check for conversion
      if (updates.status === LeadStatus.WON && updates.convertedToClientAt) {
        await this.convertLeadToClient(leadId);
      }
    }

    return { ...lead, ...updates } as Lead;
  }

  async getLeadById(id: string): Promise<Lead | null> {
    return this.leadService.getById(id);
  }

  async getLeadByPhone(phone: string): Promise<Lead | null> {
    const q = query(
      collection(db, 'crm_leads'),
      where('phone', '==', phone),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as Lead;
  }

  async getLeadsByStatus(status: LeadStatus, tenantId: string): Promise<Lead[]> {
    const q = query(
      collection(db, 'crm_leads'),
      where('tenantId', '==', tenantId),
      where('status', '==', status)
    );
    
    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
    
    // Sort locally to avoid needing composite index
    return leads.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  async getHotLeads(tenantId: string): Promise<Lead[]> {
    const q = query(
      collection(db, 'crm_leads'),
      where('tenantId', '==', tenantId),
      where('temperature', '==', 'hot')
    );
    
    const snapshot = await getDocs(q);
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];
    
    // Filter and sort locally to avoid needing composite index
    return leads
      .filter(lead => [LeadStatus.QUALIFIED, LeadStatus.OPPORTUNITY, LeadStatus.NEGOTIATION].includes(lead.status))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
  }

  // =============== INTERACTIONS ===============

  async createInteraction(data: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Interaction> {
    const interaction: Omit<Interaction, 'id'> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'crm_interactions'), {
      ...interaction,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update lead's last contact
    if (data.leadId) {
      await this.updateLead(data.leadId, {
        lastContactDate: new Date(),
        totalInteractions: (await this.getLeadInteractions(data.leadId)).length + 1
      });

      // Create activity
      await this.createActivity({
        leadId: data.leadId,
        type: 'interaction',
        description: `${data.type} - ${data.direction}`,
        metadata: { interactionId: docRef.id, type: data.type },
        userId: data.userId
      });
    }

    // Run AI analysis if it's a message
    if (data.type === InteractionType.WHATSAPP_MESSAGE && data.content) {
      await this.analyzeInteraction(docRef.id, data.content);
    }

    return { id: docRef.id, ...interaction } as Interaction;
  }

  async getLeadInteractions(leadId: string): Promise<Interaction[]> {
    const q = query(
      collection(db, 'crm_interactions'),
      where('leadId', '==', leadId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Interaction[];
  }

  async getClientInteractions(clientId: string): Promise<Interaction[]> {
    const q = query(
      collection(db, 'crm_interactions'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Interaction[];
  }

  // =============== TASKS ===============

  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task: Omit<Task, 'id'> = {
      ...data,
      status: data.status || TaskStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'crm_tasks'), {
      ...task,
      dueDate: Timestamp.fromDate(data.dueDate),
      reminderDate: data.reminderDate ? Timestamp.fromDate(data.reminderDate) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create activity
    if (data.leadId) {
      await this.createActivity({
        leadId: data.leadId,
        type: 'task',
        description: `Tarefa criada: ${data.title}`,
        metadata: { taskId: docRef.id, type: data.type },
        userId: data.assignedBy
      });
    }

    return { id: docRef.id, ...task } as Task;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    await updateDoc(doc(db, 'crm_tasks', taskId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // If task is completed, create activity
    if (updates.status === TaskStatus.COMPLETED && updates.completedAt) {
      const task = await this.taskService.getById(taskId);
      if (task?.leadId) {
        await this.createActivity({
          leadId: task.leadId,
          type: 'task',
          description: `Tarefa concluída: ${task.title}`,
          metadata: { taskId, outcome: updates.outcome },
          userId: task.assignedTo
        });
      }
    }
  }

  async getOverdueTasks(userId?: string): Promise<Task[]> {
    let q;
    const now = Timestamp.now();
    
    if (userId) {
      q = query(
        collection(db, 'crm_tasks'),
        where('assignedTo', '==', userId),
        where('status', '==', TaskStatus.PENDING),
        where('dueDate', '<', now)
      );
    } else {
      q = query(
        collection(db, 'crm_tasks'),
        where('status', '==', TaskStatus.PENDING),
        where('dueDate', '<', now)
      );
    }
    
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    // Sort locally to avoid needing composite index
    return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  async getTodayTasks(userId: string): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = addDays(today, 1);
    
    const q = query(
      collection(db, 'crm_tasks'),
      where('assignedTo', '==', userId),
      where('dueDate', '>=', Timestamp.fromDate(today)),
      where('dueDate', '<', Timestamp.fromDate(tomorrow))
    );
    
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    // Filter and sort locally to avoid needing composite index
    return tasks
      .filter(task => [TaskStatus.PENDING, TaskStatus.IN_PROGRESS].includes(task.status))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // =============== CLIENTS ===============

  async getAllClients(tenantId: string): Promise<Client[]> {
    const q = query(
      collection(db, 'clients'),
      where('tenantId', '==', tenantId)
    );
    
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
    
    // Sort locally by name
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActiveClients(tenantId: string): Promise<Client[]> {
    const q = query(
      collection(db, 'clients'),
      where('tenantId', '==', tenantId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
    
    // Sort locally by name
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }

  // =============== CONVERSION ===============

  async convertLeadToClient(leadId: string): Promise<Client> {
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error('Lead não encontrado');

    // Create client from lead
    const client: Omit<Client, 'id'> = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      whatsappNumber: lead.whatsappNumber,
      tenantId: lead.tenantId,
      preferences: {
        location: lead.preferences.location?.join(', '),
        priceRange: lead.preferences.priceRange,
        amenities: lead.preferences.amenities,
        bedrooms: lead.preferences.bedrooms?.min,
        maxGuests: lead.preferences.bedrooms?.max ? lead.preferences.bedrooms.max * 2 : undefined
      },
      reservations: [],
      totalSpent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create client in Firebase
    const clientRef = await addDoc(collection(db, 'clients'), {
      ...client,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update lead with conversion info
    await this.updateLead(leadId, {
      status: LeadStatus.WON,
      convertedToClientAt: new Date(),
      clientId: clientRef.id
    });

    // Transfer interactions to client
    const interactions = await this.getLeadInteractions(leadId);
    const batch = writeBatch(db);
    
    for (const interaction of interactions) {
      const interactionRef = doc(db, 'crm_interactions', interaction.id);
      batch.update(interactionRef, { clientId: clientRef.id });
    }
    
    await batch.commit();

    return { id: clientRef.id, ...client } as Client;
  }

  // =============== AI FEATURES ===============

  async calculateLeadScore(lead: Lead): Promise<AILeadScoring> {
    // Behavioral scoring based on interactions
    const interactions = await this.getLeadInteractions(lead.id);
    const engagementScore = Math.min(100, interactions.length * 10);
    
    // Intent scoring based on preferences
    const hasSpecificRequirements = 
      (lead.preferences.propertyType?.length || 0) > 0 ||
      lead.preferences.priceRange !== undefined ||
      lead.preferences.moveInDate !== undefined;
    const intentScore = hasSpecificRequirements ? 80 : 40;
    
    // Urgency scoring
    const urgencyScore = lead.preferences.moveInDate 
      ? Math.max(0, 100 - differenceInDays(lead.preferences.moveInDate, new Date()) * 2)
      : 30;
    
    // Calculate overall score
    const overallScore = Math.round(
      (engagementScore * 0.3) + 
      (intentScore * 0.4) + 
      (urgencyScore * 0.3)
    );
    
    // Update lead score
    await this.updateLead(lead.id, { 
      score: overallScore,
      temperature: overallScore > 75 ? 'hot' : overallScore > 50 ? 'warm' : 'cold'
    });
    
    const scoring: AILeadScoring = {
      leadId: lead.id,
      engagementScore,
      intentScore,
      urgencyScore,
      budgetFitScore: 70, // TODO: Calculate based on property prices
      requirementsFitScore: 60, // TODO: Calculate based on available properties
      locationFitScore: 80, // TODO: Calculate based on property locations
      conversionProbability: overallScore / 100,
      expectedValue: (lead.preferences.priceRange?.max || 0) * 0.7,
      expectedClosingDays: Math.max(7, 30 - (overallScore / 3)),
      recommendedProperties: [], // TODO: Implement property matching
      recommendedNextAction: this.getRecommendedAction(lead, overallScore),
      recommendedContactTime: this.getRecommendedContactTime(lead),
      calculatedAt: new Date()
    };
    
    return scoring;
  }

  private getRecommendedAction(lead: Lead, score: number): string {
    if (score > 80 && lead.status === LeadStatus.QUALIFIED) {
      return 'Agendar visita às propriedades recomendadas';
    } else if (score > 60 && lead.totalInteractions < 3) {
      return 'Enviar mensagem personalizada com opções específicas';
    } else if (lead.status === LeadStatus.NEW) {
      return 'Fazer contato inicial via WhatsApp';
    } else if (differenceInDays(new Date(), lead.lastContactDate) > 7) {
      return 'Fazer follow-up - cliente está inativo há mais de 7 dias';
    } else {
      return 'Nutrir lead com conteúdo relevante';
    }
  }

  private getRecommendedContactTime(lead: Lead): Date {
    const now = new Date();
    const recommendedHour = 10; // Default 10 AM
    
    const contactTime = new Date(now);
    contactTime.setHours(recommendedHour, 0, 0, 0);
    
    // If it's already past the recommended time today, schedule for tomorrow
    if (contactTime < now) {
      contactTime.setDate(contactTime.getDate() + 1);
    }
    
    // Skip weekends
    if (contactTime.getDay() === 0) contactTime.setDate(contactTime.getDate() + 1);
    if (contactTime.getDay() === 6) contactTime.setDate(contactTime.getDate() + 2);
    
    return contactTime;
  }

  async analyzeInteraction(interactionId: string, content: string): Promise<void> {
    // TODO: Integrate with OpenAI for real analysis
    // For now, simple keyword analysis
    const positiveKeywords = ['interessado', 'quero', 'gostei', 'perfeito', 'ótimo', 'quando'];
    const negativeKeywords = ['caro', 'não', 'problema', 'ruim', 'cancelar'];
    const intentKeywords = {
      view: ['visitar', 'ver', 'conhecer', 'visita'],
      book: ['reservar', 'alugar', 'fechar', 'contrato'],
      price: ['preço', 'valor', 'custo', 'desconto']
    };
    
    const contentLower = content.toLowerCase();
    
    // Calculate sentiment
    const positiveCount = positiveKeywords.filter(k => contentLower.includes(k)).length;
    const negativeCount = negativeKeywords.filter(k => contentLower.includes(k)).length;
    const sentiment = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);
    
    // Detect intents
    const detectedIntents = Object.entries(intentKeywords)
      .filter(([_, keywords]) => keywords.some(k => contentLower.includes(k)))
      .map(([intent]) => intent);
    
    // Generate summary and suggestions
    const aiAnalysis = {
      summary: content.substring(0, 100) + '...',
      keyPoints: detectedIntents.map(i => `Cliente demonstrou interesse em ${i}`),
      sentiment,
      intent: detectedIntents,
      suggestedActions: this.getSuggestedActions(detectedIntents, sentiment)
    };
    
    await updateDoc(doc(db, 'crm_interactions', interactionId), {
      aiAnalysis,
      sentiment: sentiment > 0.3 ? 'positive' : sentiment < -0.3 ? 'negative' : 'neutral'
    });
  }

  private getSuggestedActions(intents: string[], sentiment: number): string[] {
    const actions: string[] = [];
    
    if (intents.includes('view')) {
      actions.push('Agendar visita às propriedades');
    }
    if (intents.includes('price')) {
      actions.push('Enviar proposta com valores detalhados');
    }
    if (intents.includes('book')) {
      actions.push('Preparar contrato de locação');
    }
    if (sentiment < -0.3) {
      actions.push('Contato urgente para resolver objeções');
    }
    if (actions.length === 0) {
      actions.push('Continuar nutrição do lead');
    }
    
    return actions;
  }

  // =============== ACTIVITIES ===============

  async createActivity(data: Omit<LeadActivity, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(collection(db, 'crm_activities'), {
      ...data,
      createdAt: serverTimestamp()
    });
  }

  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    const q = query(
      collection(db, 'crm_activities'),
      where('leadId', '==', leadId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeadActivity[];
  }

  // =============== AUTOMATION ===============

  async processWhatsAppMessage(phone: string, message: string, messageId: string): Promise<void> {
    // Check if it's an existing lead
    let lead = await this.getLeadByPhone(phone);
    
    if (!lead) {
      // Create new lead from WhatsApp
      lead = await this.createLead({
        tenantId: 'default', // TODO: Get from context
        name: phone, // Will be updated when we get the name
        phone,
        whatsappNumber: phone,
        status: LeadStatus.NEW,
        source: LeadSource.WHATSAPP_AI,
        score: 60, // Default score for WhatsApp leads
        temperature: 'warm',
        qualificationCriteria: {
          budget: false,
          authority: false,
          need: false,
          timeline: false
        },
        preferences: {},
        firstContactDate: new Date(),
        lastContactDate: new Date(),
        totalInteractions: 0,
        tags: ['whatsapp', 'auto-created']
      });
    }
    
    // Create interaction
    await this.createInteraction({
      leadId: lead.id,
      tenantId: lead.tenantId,
      type: InteractionType.WHATSAPP_MESSAGE,
      channel: 'whatsapp',
      direction: 'inbound',
      content: message,
      userId: 'whatsapp-bot',
      userName: 'WhatsApp Bot'
    });
    
    // Update lead status if it's NEW
    if (lead.status === LeadStatus.NEW) {
      await this.updateLead(lead.id, { status: LeadStatus.CONTACTED });
    }
  }

  // =============== REAL-TIME SUBSCRIPTIONS ===============

  subscribeToLeadUpdates(leadId: string, callback: (lead: Lead) => void): () => void {
    const unsubscribe = onSnapshot(
      doc(db, 'crm_leads', leadId),
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() } as Lead);
        }
      }
    );
    
    return unsubscribe;
  }

  subscribeToTaskUpdates(userId: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(
      collection(db, 'crm_tasks'),
      where('assignedTo', '==', userId),
      where('status', 'in', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      callback(tasks);
    });
    
    return unsubscribe;
  }
}

export const crmService = new CRMService();