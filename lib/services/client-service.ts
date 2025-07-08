import { FirestoreService } from '@/lib/firebase/firestore'
import { Timestamp } from 'firebase/firestore'

export interface Client {
  id: string
  name: string
  email?: string
  phone: string
  document?: string
  tenantId: string
  source: 'whatsapp' | 'website' | 'referral' | 'manual'
  
  // Profile
  preferences?: {
    location?: string
    priceRange?: { min: number; max: number }
    amenities?: string[]
    propertyType?: string
    maxGuests?: number
    communicationStyle?: 'formal' | 'casual'
  }
  
  // Stats
  totalReservations?: number
  totalSpent?: number
  averageRating?: number
  lastReservationAt?: Date
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastContactAt?: Date
  isActive: boolean
  
  // Tags and notes
  tags?: string[]
  notes?: string
}

class ClientService extends FirestoreService<Client> {
  constructor() {
    super('clients')
  }

  async findByPhone(phone: string, tenantId: string): Promise<Client | null> {
    try {
      const clients = await this.query(
        this.collection
          .where('phone', '==', phone)
          .where('tenantId', '==', tenantId)
          .limit(1)
      )
      
      return clients[0] || null
    } catch (error) {
      console.error('Error finding client by phone:', error)
      return null
    }
  }

  async findByEmail(email: string, tenantId: string): Promise<Client | null> {
    try {
      const clients = await this.query(
        this.collection
          .where('email', '==', email)
          .where('tenantId', '==', tenantId)
          .limit(1)
      )
      
      return clients[0] || null
    } catch (error) {
      console.error('Error finding client by email:', error)
      return null
    }
  }

  async createOrUpdate(clientData: Partial<Client>): Promise<Client> {
    try {
      // Try to find existing client by phone
      if (clientData.phone && clientData.tenantId) {
        const existingClient = await this.findByPhone(clientData.phone, clientData.tenantId)
        
        if (existingClient) {
          // Update existing client
          const updatedData = {
            ...clientData,
            updatedAt: new Date(),
            lastContactAt: new Date()
          }
          
          return await this.update(existingClient.id, updatedData)
        }
      }

      // Create new client
      const newClient: Omit<Client, 'id'> = {
        name: clientData.name || '',
        email: clientData.email,
        phone: clientData.phone || '',
        document: clientData.document,
        tenantId: clientData.tenantId || 'default',
        source: clientData.source || 'whatsapp',
        preferences: clientData.preferences,
        totalReservations: 0,
        totalSpent: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastContactAt: new Date(),
        isActive: true,
        tags: clientData.tags || [],
        notes: clientData.notes
      }

      return await this.create(newClient)
    } catch (error) {
      console.error('Error creating or updating client:', error)
      throw error
    }
  }

  async updateStats(clientId: string, stats: {
    totalReservations?: number
    totalSpent?: number
    averageRating?: number
    lastReservationAt?: Date
  }): Promise<void> {
    try {
      await this.update(clientId, {
        ...stats,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating client stats:', error)
    }
  }

  async addTag(clientId: string, tag: string): Promise<void> {
    try {
      const client = await this.getById(clientId)
      if (!client) return

      const tags = client.tags || []
      if (!tags.includes(tag)) {
        tags.push(tag)
        await this.update(clientId, { tags, updatedAt: new Date() })
      }
    } catch (error) {
      console.error('Error adding tag to client:', error)
    }
  }

  async removeTag(clientId: string, tag: string): Promise<void> {
    try {
      const client = await this.getById(clientId)
      if (!client) return

      const tags = (client.tags || []).filter(t => t !== tag)
      await this.update(clientId, { tags, updatedAt: new Date() })
    } catch (error) {
      console.error('Error removing tag from client:', error)
    }
  }

  async searchClients(tenantId: string, filters: {
    search?: string
    source?: string
    tags?: string[]
    dateFrom?: Date
    dateTo?: Date
    isActive?: boolean
  }): Promise<Client[]> {
    try {
      let query = this.collection.where('tenantId', '==', tenantId)

      if (filters.source) {
        query = query.where('source', '==', filters.source)
      }

      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive)
      }

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', filters.dateTo)
      }

      let clients = await this.query(query.orderBy('createdAt', 'desc'))

      // Apply text search filter (client-side)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        clients = clients.filter(client =>
          client.name.toLowerCase().includes(searchTerm) ||
          client.email?.toLowerCase().includes(searchTerm) ||
          client.phone.includes(searchTerm)
        )
      }

      // Apply tags filter (client-side)
      if (filters.tags && filters.tags.length > 0) {
        clients = clients.filter(client =>
          filters.tags!.some(tag => client.tags?.includes(tag))
        )
      }

      return clients
    } catch (error) {
      console.error('Error searching clients:', error)
      return []
    }
  }

  async getClientStats(tenantId: string): Promise<{
    total: number
    active: number
    inactive: number
    recentClients: number
    topSpenders: Client[]
    sourceBreakdown: Record<string, number>
  }> {
    try {
      const clients = await this.query(
        this.collection.where('tenantId', '==', tenantId)
      )

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const stats = {
        total: clients.length,
        active: clients.filter(c => c.isActive).length,
        inactive: clients.filter(c => !c.isActive).length,
        recentClients: clients.filter(c => c.createdAt >= thirtyDaysAgo).length,
        topSpenders: clients
          .filter(c => c.totalSpent && c.totalSpent > 0)
          .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
          .slice(0, 10),
        sourceBreakdown: clients.reduce((acc, client) => {
          acc[client.source] = (acc[client.source] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      return stats
    } catch (error) {
      console.error('Error getting client stats:', error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        recentClients: 0,
        topSpenders: [],
        sourceBreakdown: {}
      }
    }
  }

  async updatePreferences(clientId: string, preferences: Partial<Client['preferences']>): Promise<void> {
    try {
      const client = await this.getById(clientId)
      if (!client) return

      const updatedPreferences = {
        ...client.preferences,
        ...preferences
      }

      await this.update(clientId, {
        preferences: updatedPreferences,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error updating client preferences:', error)
    }
  }

  async markAsInactive(clientId: string): Promise<void> {
    try {
      await this.update(clientId, {
        isActive: false,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error marking client as inactive:', error)
    }
  }

  async getRecentClients(tenantId: string, limit: number = 10): Promise<Client[]> {
    try {
      return await this.query(
        this.collection
          .where('tenantId', '==', tenantId)
          .where('isActive', '==', true)
          .orderBy('lastContactAt', 'desc')
          .limit(limit)
      )
    } catch (error) {
      console.error('Error getting recent clients:', error)
      return []
    }
  }

  // Override toFirestore to handle Date conversion
  protected override toFirestore(data: any): any {
    const result = { ...data }

    if (result.createdAt instanceof Date) {
      result.createdAt = Timestamp.fromDate(result.createdAt)
    }
    if (result.updatedAt instanceof Date) {
      result.updatedAt = Timestamp.fromDate(result.updatedAt)
    }
    if (result.lastContactAt instanceof Date) {
      result.lastContactAt = Timestamp.fromDate(result.lastContactAt)
    }
    if (result.lastReservationAt instanceof Date) {
      result.lastReservationAt = Timestamp.fromDate(result.lastReservationAt)
    }

    return result
  }

  // Override fromFirestore to handle Timestamp conversion
  protected override fromFirestore(data: any): any {
    const result = { ...data }

    if (result.createdAt?.toDate) {
      result.createdAt = result.createdAt.toDate()
    }
    if (result.updatedAt?.toDate) {
      result.updatedAt = result.updatedAt.toDate()
    }
    if (result.lastContactAt?.toDate) {
      result.lastContactAt = result.lastContactAt.toDate()
    }
    if (result.lastReservationAt?.toDate) {
      result.lastReservationAt = result.lastReservationAt.toDate()
    }

    return result
  }
}

export const clientService = new ClientService()
export { ClientService }