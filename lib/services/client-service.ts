import { Client } from '@/lib/types';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

export class ClientService {
  private getTenantService(tenantId: string) {
    return new TenantServiceFactory(tenantId).clients;
  }

  async createOrUpdate(clientData: {
    name: string;
    email?: string;
    document?: string;
    phone: string;
    tenantId: string; // Agora obrigatório
    source?: string;
  }): Promise<Client> {
    logger.info('👤 [ClientService] Criar/atualizar cliente', {
      tenantId: clientData.tenantId,
      phone: clientData.phone.substring(0, 6) + '***',
      hasEmail: !!clientData.email
    });

    // Check if client exists using findByPhone which considers tenantId
    const existingClient = await this.findByPhone(clientData.phone, clientData.tenantId);
    
    // Filtrar campos undefined para evitar erro no Firebase
    const cleanedData: any = {
      name: clientData.name,
      phone: clientData.phone,
      tenantId: clientData.tenantId,
      source: clientData.source || 'whatsapp'
    };
    
    // Adicionar campos opcionais apenas se não forem undefined/vazios
    if (clientData.email && clientData.email.trim() !== '') {
      cleanedData.email = clientData.email;
    }
    if (clientData.document && clientData.document.trim() !== '') {
      cleanedData.document = clientData.document;
    }
    
    const tenantClientService = this.getTenantService(clientData.tenantId);

    if (existingClient) {
      // Update existing client with new data (preserving existing data)
      const updatedData = {
        ...existingClient,
        ...cleanedData,
        updatedAt: new Date()
      };
      await tenantClientService.update(existingClient.id!, updatedData);
      
      logger.info('✅ [ClientService] Cliente atualizado', {
        tenantId: clientData.tenantId,
        clientId: existingClient.id
      });
      
      return updatedData;
    } else {
      // Create new client
      const newClientData = {
        ...cleanedData,
        preferences: {
          communicationPreference: 'whatsapp',
          marketingOptIn: true,
          petOwner: false,
          smoker: false
        },
        reservations: [],
        totalSpent: 0,
        totalReservations: 0,
        isActive: true,
        isVip: false,
        tags: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const id = await tenantClientService.create(newClientData as any);
      
      logger.info('✅ [ClientService] Novo cliente criado', {
        tenantId: clientData.tenantId,
        clientId: id
      });
      
      return {
        id,
        ...newClientData
      } as Client;
    }
  }

  async getById(id: string, tenantId: string): Promise<Client | null> {
    const tenantClientService = this.getTenantService(tenantId);
    return await tenantClientService.get(id) as Client | null;
  }

  async update(id: string, client: Partial<Client>, tenantId: string): Promise<void> {
    const tenantClientService = this.getTenantService(tenantId);
    return await tenantClientService.update(id, client);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tenantClientService = this.getTenantService(tenantId);
    return await tenantClientService.delete(id);
  }

  async getAll(tenantId: string): Promise<Client[]> {
    const tenantClientService = this.getTenantService(tenantId);
    return await tenantClientService.getAll() as Client[];
  }

  async findByPhone(phoneNumber: string, tenantId: string): Promise<Client | null> {
    try {
      const tenantClientService = this.getTenantService(tenantId);
      const clients = await tenantClientService.getMany([
        { field: 'phone', operator: '==', value: phoneNumber }
      ]) as Client[];
      
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      logger.error('❌ [ClientService] Erro ao buscar cliente por telefone', {
        phone: phoneNumber.substring(0, 6) + '***',
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async create(clientData: {
    name: string;
    email?: string;
    document?: string;
    phone: string;
    tenantId: string; // Agora obrigatório
    source?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Promise<Client> {
    // Check for duplicates before creating
    const existingClient = await this.findByPhone(clientData.phone, clientData.tenantId);
    if (existingClient) {
      throw new Error(`Cliente com telefone ${clientData.phone} já existe. Use createOrUpdate() para atualizar dados existentes.`);
    }
    
    const tenantClientService = this.getTenantService(clientData.tenantId);
    
    // Filtrar campos undefined para evitar erro no Firebase
    const cleanedData: any = {
      name: clientData.name,
      phone: clientData.phone,
      tenantId: clientData.tenantId,
      source: clientData.source || 'whatsapp',
      preferences: {
        communicationPreference: 'whatsapp',
        marketingOptIn: true,
        petOwner: false,
        smoker: false
      },
      reservations: [],
      totalSpent: 0,
      totalReservations: 0,
      isActive: true,
      isVip: false,
      tags: [],
      notes: '',
      createdAt: clientData.createdAt || new Date(),
      updatedAt: clientData.updatedAt || new Date()
    };
    
    // Adicionar campos opcionais apenas se não forem undefined/vazios
    if (clientData.email && clientData.email.trim() !== '') {
      cleanedData.email = clientData.email;
    }
    if (clientData.document && clientData.document.trim() !== '') {
      cleanedData.document = clientData.document;
    }
    
    const id = await tenantClientService.create(cleanedData as any);
    
    logger.info('✅ [ClientService] Cliente criado', {
      tenantId: clientData.tenantId,
      clientId: id
    });
    
    // Retornar o cliente completo com ID
    return {
      id,
      ...cleanedData,
      createdAt: cleanedData.createdAt || new Date(),
      updatedAt: cleanedData.updatedAt || new Date()
    } as Client;
  }
}

export const clientServiceWrapper = new ClientService();