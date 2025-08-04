// lib/services/tenant-aware-client-service.ts
// NOVA VERSÃO - Serviço de clientes com estrutura multi-tenant correta

import { Client } from '@/lib/types/client';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

export class TenantAwareClientService {
  private tenantId: string;
  private serviceFactory: TenantServiceFactory;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.serviceFactory = new TenantServiceFactory(tenantId);
  }

  /**
   * Criar novo cliente
   */
  async create(clientData: Omit<Client, 'id'>): Promise<string | null> {
    try {
      logger.info('👤 [TenantClientService] Criando cliente', {
        tenantId: this.tenantId,
        clientName: clientData.name,
        clientPhone: clientData.phone?.substring(0, 6) + '***'
      });

      const clientService = this.serviceFactory.clients;
      const clientId = await clientService.create(clientData);

      logger.info('✅ [TenantClientService] Cliente criado', {
        tenantId: this.tenantId,
        clientId,
        clientName: clientData.name
      });

      return clientId;
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro ao criar cliente', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Obter cliente por ID
   */
  async getById(clientId: string): Promise<Client | null> {
    try {
      const clientService = this.serviceFactory.clients;
      const client = await clientService.getById(clientId) as Client | null;

      if (client) {
        logger.info('✅ [TenantClientService] Cliente encontrado', {
          tenantId: this.tenantId,
          clientId,
          clientName: client.name
        });
      }

      return client;
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro ao obter cliente', {
        tenantId: this.tenantId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Obter todos os clientes do tenant
   */
  async getAll(): Promise<Client[]> {
    try {
      const clientService = this.serviceFactory.clients;
      const clients = await clientService.getAll() as Client[];

      logger.info('📊 [TenantClientService] Clientes obtidos', {
        tenantId: this.tenantId,
        totalClients: clients.length
      });

      return clients;
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro ao obter clientes', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Buscar cliente por telefone
   */
  async findByPhone(phone: string): Promise<Client | null> {
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      const clients = await this.getAll();
      
      const client = clients.find(c => {
        const clientPhone = c.phone?.replace(/\D/g, '') || c.whatsappNumber?.replace(/\D/g, '');
        return clientPhone === normalizedPhone || 
               clientPhone?.includes(normalizedPhone) ||
               normalizedPhone.includes(clientPhone || '');
      });

      if (client) {
        logger.info('✅ [TenantClientService] Cliente encontrado por telefone', {
          tenantId: this.tenantId,
          clientId: client.id,
          clientName: client.name,
          phone: phone.substring(0, 6) + '***'
        });
      }

      return client || null;
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro ao buscar cliente por telefone', {
        tenantId: this.tenantId,
        phone: phone.substring(0, 6) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Buscar cliente por email
   */
  async findByEmail(email: string): Promise<Client | null> {
    try {
      const clients = await this.getAll();
      const client = clients.find(c => c.email?.toLowerCase() === email.toLowerCase());

      if (client) {
        logger.info('✅ [TenantClientService] Cliente encontrado por email', {
          tenantId: this.tenantId,
          clientId: client.id,
          clientName: client.name,
          email: email.substring(0, 3) + '***'
        });
      }

      return client || null;
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro ao buscar cliente por email', {
        tenantId: this.tenantId,
        email: email.substring(0, 3) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Atualizar cliente
   */
  async update(clientId: string, data: Partial<Client>): Promise<boolean> {
    try {
      const clientService = this.serviceFactory.clients;
      await clientService.update(clientId, data);

      logger.info('✅ [TenantClientService] Cliente atualizado', {
        tenantId: this.tenantId,
        clientId,
        updatedFields: Object.keys(data)
      });

      return true;
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro ao atualizar cliente', {
        tenantId: this.tenantId,
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Registrar cliente com deduplicação
   */
  async registerWithDeduplication(clientData: {
    name: string;
    phone?: string;
    email?: string;
    document?: string;
    whatsappNumber?: string;
  }): Promise<{ clientId: string; isNew: boolean }> {
    try {
      logger.info('🔍 [TenantClientService] Registrando cliente com deduplicação', {
        tenantId: this.tenantId,
        clientName: clientData.name,
        hasPhone: !!clientData.phone,
        hasEmail: !!clientData.email
      });

      // Tentar encontrar cliente existente
      let existingClient: Client | null = null;

      // Buscar por telefone (prioridade)
      if (clientData.phone) {
        existingClient = await this.findByPhone(clientData.phone);
      }

      // Se não encontrou por telefone, buscar por email
      if (!existingClient && clientData.email) {
        existingClient = await this.findByEmail(clientData.email);
      }

      if (existingClient) {
        // Cliente existe, atualizar dados se necessário
        const updateData: Partial<Client> = {};
        
        if (clientData.name && clientData.name !== existingClient.name) {
          updateData.name = clientData.name;
        }
        if (clientData.email && clientData.email !== existingClient.email) {
          updateData.email = clientData.email;
        }
        if (clientData.document && clientData.document !== existingClient.document) {
          updateData.document = clientData.document;
        }

        if (Object.keys(updateData).length > 0) {
          await this.update(existingClient.id!, updateData);
        }

        return { clientId: existingClient.id!, isNew: false };
      }

      // Cliente não existe, criar novo
      const newClientData: Omit<Client, 'id'> = {
        name: clientData.name,
        phone: clientData.phone,
        email: clientData.email,
        document: clientData.document,
        whatsappNumber: clientData.whatsappNumber || clientData.phone,
        isActive: true,
        source: 'whatsapp',
        leadScore: 50,
        tags: ['whatsapp-lead']
      };

      const clientId = await this.create(newClientData);
      
      if (!clientId) {
        throw new Error('Falha ao criar cliente');
      }

      return { clientId, isNew: true };
    } catch (error) {
      logger.error('❌ [TenantClientService] Erro no registro com deduplicação', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Factory function
export function createTenantClientService(tenantId: string): TenantAwareClientService {
  return new TenantAwareClientService(tenantId);
}