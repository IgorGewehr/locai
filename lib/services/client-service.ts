import { Client } from '@/lib/types';
import { clientService } from '@/lib/firebase/firestore';

export class ClientService {
  async createOrUpdate(clientData: {
    name: string;
    email?: string;
    document?: string;
    phone: string;
    tenantId?: string;
    source?: string;
  }): Promise<Client> {
    // Check if client exists using findByPhone which considers tenantId
    const existingClient = await this.findByPhone(clientData.phone, clientData.tenantId);
    
    // Filtrar campos undefined para evitar erro no Firebase
    const cleanedData: any = {
      name: clientData.name,
      phone: clientData.phone,
      tenantId: clientData.tenantId || 'default',
      source: clientData.source || 'whatsapp'
    };
    
    // Adicionar campos opcionais apenas se não forem undefined/vazios
    if (clientData.email && clientData.email.trim() !== '') {
      cleanedData.email = clientData.email;
    }
    if (clientData.document && clientData.document.trim() !== '') {
      cleanedData.document = clientData.document;
    }
    
    if (existingClient) {
      // Update existing client with new data (preserving existing data)
      const updatedData = {
        ...existingClient,
        ...cleanedData,
        updatedAt: new Date()
      };
      await clientService.update(existingClient.id, updatedData);
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
      
      const id = await clientService.create(newClientData as any);
      
      return {
        id,
        ...newClientData
      } as Client;
    }
  }

  async getById(id: string): Promise<Client | null> {
    return clientService.getById(id);
  }

  async update(id: string, client: Partial<Client>): Promise<void> {
    return clientService.update(id, client);
  }

  async delete(id: string): Promise<void> {
    return clientService.delete(id);
  }

  async getAll(): Promise<Client[]> {
    return clientService.getAll();
  }

  async findByPhone(phoneNumber: string, tenantId?: string): Promise<Client | null> {
    try {
      let clients: Client[];
      
      if (tenantId) {
        // Use compound query when tenantId is provided to prevent duplicates across tenants
        clients = await clientService.getMany([
          { field: 'phone', operator: '==', value: phoneNumber },
          { field: 'tenantId', operator: '==', value: tenantId }
        ]);
      } else {
        // Fallback to simple query
        clients = await clientService.getWhere('phone', '==', phoneNumber);
      }
      
      return clients.length > 0 ? clients[0] : null;
    } catch (error) {
      console.error('Error finding client by phone:', error);
      return null;
    }
  }

  async create(clientData: {
    name: string;
    email?: string;
    document?: string;
    phone: string;
    tenantId?: string;
    source?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Promise<Client> {
    // Check for duplicates before creating
    const existingClient = await this.findByPhone(clientData.phone, clientData.tenantId);
    if (existingClient) {
      throw new Error(`Cliente com telefone ${clientData.phone} já existe. Use createOrUpdate() para atualizar dados existentes.`);
    }
    
    // Filtrar campos undefined para evitar erro no Firebase
    const cleanedData: any = {
      name: clientData.name,
      phone: clientData.phone,
      tenantId: clientData.tenantId || 'default',
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
    
    const id = await clientService.create(cleanedData as any);
    
    return {
      id,
      ...cleanedData
    } as Client;
  }
}

export const clientServiceWrapper = new ClientService();