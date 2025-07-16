import { Client } from '@/lib/types';
import { clientService } from '@/lib/firebase/firestore';

export class ClientService {
  async createOrUpdate(clientData: {
    name: string;
    email?: string;
    document?: string;
    phone: string;
    tenantId?: string;
  }): Promise<Client> {
    // Check if client exists
    const existingClient = await clientService.getWhere('phone', '==', clientData.phone);
    
    if (existingClient.length > 0) {
      // Update existing client
      const client = existingClient[0];
      await clientService.update(client.id, clientData);
      return { ...client, ...clientData };
    } else {
      // Create new client
      const id = await clientService.create({
        ...clientData,
        preferences: {},
        reservations: [],
        totalSpent: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      
      return {
        id,
        ...clientData,
        preferences: {},
        reservations: [],
        totalSpent: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
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
      const clients = await clientService.getWhere('phone', '==', phoneNumber);
      
      if (clients.length === 0) {
        return null;
      }
      
      // If tenantId is provided, filter by it
      if (tenantId) {
        const tenantClients = clients.filter(client => client.tenantId === tenantId);
        return tenantClients.length > 0 ? tenantClients[0] : null;
      }
      
      return clients[0];
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
    const id = await clientService.create({
      ...clientData,
      preferences: {},
      reservations: [],
      totalSpent: 0,
      isActive: true,
      createdAt: clientData.createdAt || new Date(),
      updatedAt: clientData.updatedAt || new Date()
    } as any);
    
    return {
      id,
      ...clientData,
      preferences: {},
      reservations: [],
      totalSpent: 0,
      isActive: true,
      createdAt: clientData.createdAt || new Date(),
      updatedAt: clientData.updatedAt || new Date()
    } as Client;
  }
}

export const clientServiceWrapper = new ClientService();