// lib/services/tenant-phone-mapping.ts
// Serviço para mapear telefones WhatsApp para tenants

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

interface PhoneTenantMapping {
  phone: string;
  tenantId: string;
  whatsappNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantConfig {
  id: string;
  name: string;
  whatsappNumbers: string[];
  isActive: boolean;
  defaultWhatsappNumber?: string;
}

class TenantPhoneMappingService {
  private readonly MAPPINGS_COLLECTION = 'phone_tenant_mappings';
  private readonly TENANTS_COLLECTION = 'tenants';

  /**
   * Resolve tenantId baseado no número de telefone do cliente
   */
  async resolveTenantFromClientPhone(clientPhone: string): Promise<string | null> {
    try {
      logger.info('🔍 [TenantMapping] Resolvendo tenant por telefone do cliente', {
        phone: clientPhone.substring(0, 6) + '***'
      });

      // 1. Verificar cache/mapeamento direto
      const mapping = await this.getDirectMapping(clientPhone);
      if (mapping) {
        logger.info('✅ [TenantMapping] Mapeamento direto encontrado', {
          tenantId: mapping.tenantId,
          phone: clientPhone.substring(0, 6) + '***'
        });
        return mapping.tenantId;
      }

      // 2. Buscar por configuração de tenant (número de WhatsApp Business)
      const tenantByWhatsApp = await this.findTenantByWhatsAppConfig(clientPhone);
      if (tenantByWhatsApp) {
        // Criar mapeamento para otimizar próximas consultas
        await this.createMapping(clientPhone, tenantByWhatsApp);
        return tenantByWhatsApp;
      }

      // 3. Usar tenant padrão (fallback para produção)
      const defaultTenant = process.env.DEFAULT_TENANT_ID || 'U11UvXr67vWnDtDpDaaJDTuEcxo2';
      if (defaultTenant) {
        logger.warn('⚠️ [TenantMapping] Usando tenant padrão (fallback)', {
          tenantId: defaultTenant,
          phone: clientPhone.substring(0, 6) + '***',
          env: process.env.NODE_ENV || 'unknown'
        });
        // Criar mapeamento para otimizar próximas consultas
        await this.createMapping(clientPhone, defaultTenant);
        return defaultTenant;
      }

      logger.error('❌ [TenantMapping] Nenhum tenant encontrado para telefone', undefined, {
        phone: clientPhone.substring(0, 6) + '***'
      });
      return null;

    } catch (error) {
      logger.error('❌ [TenantMapping] Erro ao resolver tenant', 
        error instanceof Error ? error : new Error('Unknown error'), {
        phone: clientPhone.substring(0, 6) + '***'
      });
      return null;
    }
  }

  /**
   * Busca mapeamento direto no Firestore
   */
  private async getDirectMapping(phone: string): Promise<PhoneTenantMapping | null> {
    try {
      const mappingsRef = collection(db, this.MAPPINGS_COLLECTION);
      const q = query(mappingsRef, where('phone', '==', phone), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        } as PhoneTenantMapping;
      }

      return null;
    } catch (error) {
      logger.error('❌ [TenantMapping] Erro ao buscar mapeamento direto', 
        error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  /**
   * Busca tenant baseado na configuração de WhatsApp
   */
  private async findTenantByWhatsAppConfig(clientPhone: string): Promise<string | null> {
    try {
      // Lógica para determinar tenant baseado em:
      // 1. Número de WhatsApp Business configurado para cada tenant
      // 2. Prefixos regionais
      // 3. Configurações específicas

      const tenantsRef = collection(db, this.TENANTS_COLLECTION);
      const querySnapshot = await getDocs(tenantsRef);

      for (const doc of querySnapshot.docs) {
        const tenantData = doc.data() as TenantConfig;
        
        if (tenantData.isActive && tenantData.whatsappNumbers) {
          // Verificar se o cliente está associado a este tenant
          // (isso depende da lógica de negócio específica)
          
          // Exemplo: se tem apenas um tenant ativo, usar ele
          if (querySnapshot.size === 1) {
            logger.info('✅ [TenantMapping] Único tenant ativo encontrado', {
              tenantId: doc.id
            });
            return doc.id;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('❌ [TenantMapping] Erro ao buscar tenant por config', 
        error instanceof Error ? error : new Error('Unknown error'));
      return null;
    }
  }

  /**
   * Cria um novo mapeamento phone -> tenant
   */
  async createMapping(phone: string, tenantId: string): Promise<void> {
    try {
      const mappingRef = doc(db, this.MAPPINGS_COLLECTION, `${phone}_${tenantId}`);
      
      const mappingData: PhoneTenantMapping = {
        phone,
        tenantId,
        whatsappNumber: phone,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(mappingRef, mappingData);

      logger.info('✅ [TenantMapping] Mapeamento criado', {
        phone: phone.substring(0, 6) + '***',
        tenantId
      });
    } catch (error) {
      logger.error('❌ [TenantMapping] Erro ao criar mapeamento', 
        error instanceof Error ? error : new Error('Unknown error'), {
        phone: phone.substring(0, 6) + '***',
        tenantId
      });
    }
  }

  /**
   * Atualiza configuração de tenant com números WhatsApp
   */
  async updateTenantWhatsAppConfig(tenantId: string, whatsappNumbers: string[]): Promise<void> {
    try {
      const tenantRef = doc(db, this.TENANTS_COLLECTION, tenantId);
      const tenantDoc = await getDoc(tenantRef);

      if (tenantDoc.exists()) {
        await setDoc(tenantRef, {
          ...tenantDoc.data(),
          whatsappNumbers,
          updatedAt: new Date()
        }, { merge: true });

        logger.info('✅ [TenantMapping] Configuração WhatsApp atualizada', {
          tenantId,
          numbersCount: whatsappNumbers.length
        });
      } else {
        // Criar novo tenant
        const tenantData: TenantConfig = {
          id: tenantId,
          name: `Tenant ${tenantId}`,
          whatsappNumbers,
          isActive: true
        };

        await setDoc(tenantRef, tenantData);

        logger.info('✅ [TenantMapping] Novo tenant criado', {
          tenantId,
          numbersCount: whatsappNumbers.length
        });
      }
    } catch (error) {
      logger.error('❌ [TenantMapping] Erro ao atualizar config WhatsApp', 
        error instanceof Error ? error : new Error('Unknown error'), {
        tenantId
      });
    }
  }

  /**
   * Lista todos os mapeamentos ativos
   */
  async listActiveMappings(): Promise<PhoneTenantMapping[]> {
    try {
      const mappingsRef = collection(db, this.MAPPINGS_COLLECTION);
      const q = query(mappingsRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as PhoneTenantMapping[];
    } catch (error) {
      logger.error('❌ [TenantMapping] Erro ao listar mapeamentos', 
        error instanceof Error ? error : new Error('Unknown error'));
      return [];
    }
  }
}

export const tenantPhoneMappingService = new TenantPhoneMappingService();