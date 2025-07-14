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
}

export const clientServiceWrapper = new ClientService();