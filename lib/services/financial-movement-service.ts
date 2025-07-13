import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  FinancialMovement,
  CreateFinancialMovementInput,
  UpdateFinancialMovementInput,
  FinancialMovementFilters,
  FinancialSummary,
  MovementStatus,
  MovementType,
  MovementCategory
} from '@/lib/types/financial-movement'
import { startOfDay, endOfDay, differenceInDays, addDays } from 'date-fns'

const COLLECTION_NAME = 'financial_movements'

export class FinancialMovementService {
  private collectionRef = collection(db, COLLECTION_NAME)

  // Criar nova movimentação
  async create(data: CreateFinancialMovementInput & { tenantId: string }): Promise<FinancialMovement> {
    const now = new Date()
    
    // Calcular dias de atraso se vencido
    const overdueDays = data.dueDate < now ? differenceInDays(now, data.dueDate) : 0
    const status: MovementStatus = overdueDays > 0 ? 'overdue' : 'pending'
    
    const movement: Omit<FinancialMovement, 'id'> = {
      ...data,
      status,
      overdueDays,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      remindersSent: 0,
      autoCharge: data.autoCharge || false,
      isRecurring: data.isRecurring || false,
      isInstallment: false,
      createdBy: 'system',
      dueDate: Timestamp.fromDate(data.dueDate)
    }

    const docRef = await addDoc(this.collectionRef, movement)
    return { ...movement, id: docRef.id } as FinancialMovement
  }

  // Buscar por ID
  async getById(id: string): Promise<FinancialMovement | null> {
    const docRef = doc(this.collectionRef, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    return { id: docSnap.id, ...docSnap.data() } as FinancialMovement
  }

  // Listar com filtros
  async list(filters: FinancialMovementFilters & { tenantId: string }): Promise<FinancialMovement[]> {
    const constraints: QueryConstraint[] = [
      where('tenantId', '==', filters.tenantId)
    ]

    if (filters.type) {
      constraints.push(where('type', '==', filters.type))
    }

    if (filters.category) {
      constraints.push(where('category', '==', filters.category))
    }

    if (filters.status) {
      constraints.push(where('status', '==', filters.status))
    }

    if (filters.propertyId) {
      constraints.push(where('propertyId', '==', filters.propertyId))
    }

    if (filters.clientId) {
      constraints.push(where('clientId', '==', filters.clientId))
    }

    if (filters.startDate) {
      constraints.push(where('dueDate', '>=', Timestamp.fromDate(startOfDay(filters.startDate))))
    }

    if (filters.endDate) {
      constraints.push(where('dueDate', '<=', Timestamp.fromDate(endOfDay(filters.endDate))))
    }

    constraints.push(orderBy('dueDate', 'desc'))

    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)
    
    let movements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FinancialMovement))

    // Filtros adicionais que não podem ser feitos no Firestore
    if (filters.minAmount !== undefined) {
      movements = movements.filter(m => m.amount >= filters.minAmount!)
    }

    if (filters.maxAmount !== undefined) {
      movements = movements.filter(m => m.amount <= filters.maxAmount!)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      movements = movements.filter(m => 
        m.description.toLowerCase().includes(searchLower) ||
        m.clientName?.toLowerCase().includes(searchLower) ||
        m.propertyName?.toLowerCase().includes(searchLower)
      )
    }

    return movements
  }

  // Atualizar movimentação
  async update(id: string, data: UpdateFinancialMovementInput): Promise<void> {
    const docRef = doc(this.collectionRef, id)
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    }

    if (data.dueDate) {
      updateData.dueDate = Timestamp.fromDate(data.dueDate)
    }

    if (data.paymentDate) {
      updateData.paymentDate = Timestamp.fromDate(data.paymentDate)
    }

    // Recalcular dias de atraso se necessário
    if (data.dueDate || data.status) {
      const movement = await this.getById(id)
      if (movement) {
        const dueDate = data.dueDate || movement.dueDate
        const now = new Date()
        const dueDateValue = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate
        
        if (data.status !== 'paid' && data.status !== 'cancelled' && dueDateValue < now) {
          updateData.overdueDays = differenceInDays(now, dueDateValue)
          updateData.status = 'overdue'
        } else if (data.status === 'paid' || data.status === 'cancelled') {
          updateData.overdueDays = 0
        }
      }
    }

    await updateDoc(docRef, updateData)
  }

  // Marcar como pago
  async markAsPaid(id: string, paymentDetails: {
    paymentDate?: Date
    paymentMethod?: string
    paymentProof?: string
  }): Promise<void> {
    await this.update(id, {
      status: 'paid',
      paymentDate: paymentDetails.paymentDate || new Date(),
      paymentMethod: paymentDetails.paymentMethod as any,
      paymentProof: paymentDetails.paymentProof
    })
  }

  // Cancelar movimentação
  async cancel(id: string, reason?: string): Promise<void> {
    await this.update(id, {
      status: 'cancelled',
      notes: reason
    })
  }

  // Obter movimentações vencidas
  async getOverdue(tenantId: string): Promise<FinancialMovement[]> {
    const now = new Date()
    const constraints = [
      where('tenantId', '==', tenantId),
      where('status', '==', 'pending'),
      where('dueDate', '<', Timestamp.fromDate(now)),
      orderBy('dueDate', 'asc')
    ]

    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)
    
    const movements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FinancialMovement))

    // Atualizar status e dias de atraso
    for (const movement of movements) {
      const dueDate = movement.dueDate instanceof Timestamp ? movement.dueDate.toDate() : movement.dueDate
      const overdueDays = differenceInDays(now, dueDate)
      
      if (movement.status !== 'overdue' || movement.overdueDays !== overdueDays) {
        await this.update(movement.id, {
          status: 'overdue',
          notes: `Atualizado automaticamente - ${overdueDays} dias de atraso`
        })
        movement.status = 'overdue'
        movement.overdueDays = overdueDays
      }
    }

    return movements
  }

  // Obter próximos vencimentos
  async getUpcoming(tenantId: string, days: number = 7): Promise<FinancialMovement[]> {
    const now = new Date()
    const future = addDays(now, days)
    
    const constraints = [
      where('tenantId', '==', tenantId),
      where('status', '==', 'pending'),
      where('dueDate', '>=', Timestamp.fromDate(now)),
      where('dueDate', '<=', Timestamp.fromDate(future)),
      orderBy('dueDate', 'asc')
    ]

    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FinancialMovement))
  }

  // Criar movimentações recorrentes
  async createRecurring(baseMovement: CreateFinancialMovementInput & { tenantId: string }, months: number = 12): Promise<string[]> {
    const ids: string[] = []
    
    for (let i = 0; i < months; i++) {
      const dueDate = new Date(baseMovement.dueDate)
      
      if (baseMovement.recurringType === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i)
      } else if (baseMovement.recurringType === 'weekly') {
        dueDate.setDate(dueDate.getDate() + (i * 7))
      }
      
      const movement = await this.create({
        ...baseMovement,
        dueDate,
        description: `${baseMovement.description} - ${i + 1}/${months}`,
        recurringParentId: i === 0 ? undefined : ids[0]
      })
      
      ids.push(movement.id)
    }
    
    return ids
  }

  // Criar parcelamento
  async createInstallments(
    baseMovement: CreateFinancialMovementInput & { tenantId: string }, 
    installments: number
  ): Promise<string[]> {
    const ids: string[] = []
    const installmentAmount = Math.round((baseMovement.amount / installments) * 100) / 100
    const firstInstallmentAmount = baseMovement.amount - (installmentAmount * (installments - 1))
    
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(baseMovement.dueDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      
      const movement = await this.create({
        ...baseMovement,
        dueDate,
        amount: i === 0 ? firstInstallmentAmount : installmentAmount,
        description: `${baseMovement.description} - Parcela ${i + 1}/${installments}`,
        isInstallment: true,
        installmentNumber: i + 1,
        totalInstallments: installments,
        originalMovementId: i === 0 ? undefined : ids[0]
      })
      
      ids.push(movement.id)
    }
    
    return ids
  }

  // Gerar resumo financeiro
  async getSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinancialSummary> {
    const movements = await this.list({
      tenantId,
      startDate,
      endDate
    })

    const summary: FinancialSummary = {
      period: { start: startDate, end: endDate },
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      byCategory: [],
      byProperty: []
    }

    const categoryMap = new Map<MovementCategory, { income: number, expenses: number, count: number }>()
    const propertyMap = new Map<string, { propertyName: string, income: number, expenses: number, balance: number }>()

    for (const movement of movements) {
      // Totais gerais
      if (movement.type === 'income') {
        summary.totalIncome += movement.amount
      } else {
        summary.totalExpenses += movement.amount
      }

      // Por status
      switch (movement.status) {
        case 'pending':
          summary.pending.count++
          summary.pending.amount += movement.amount
          break
        case 'paid':
          summary.paid.count++
          summary.paid.amount += movement.amount
          break
        case 'overdue':
          summary.overdue.count++
          summary.overdue.amount += movement.amount
          break
      }

      // Por categoria
      const categoryData = categoryMap.get(movement.category) || { income: 0, expenses: 0, count: 0 }
      if (movement.type === 'income') {
        categoryData.income += movement.amount
      } else {
        categoryData.expenses += movement.amount
      }
      categoryData.count++
      categoryMap.set(movement.category, categoryData)

      // Por propriedade
      if (movement.propertyId) {
        const propertyData = propertyMap.get(movement.propertyId) || {
          propertyName: movement.propertyName || 'Propriedade',
          income: 0,
          expenses: 0,
          balance: 0
        }
        
        if (movement.type === 'income') {
          propertyData.income += movement.amount
        } else {
          propertyData.expenses += movement.amount
        }
        propertyData.balance = propertyData.income - propertyData.expenses
        propertyMap.set(movement.propertyId, propertyData)
      }
    }

    summary.balance = summary.totalIncome - summary.totalExpenses

    // Converter mapas para arrays
    summary.byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data
    }))

    summary.byProperty = Array.from(propertyMap.entries()).map(([propertyId, data]) => ({
      propertyId,
      ...data
    }))

    return summary
  }

  // Observar mudanças em tempo real
  subscribeToChanges(
    tenantId: string,
    callback: (movements: FinancialMovement[]) => void
  ): Unsubscribe {
    const q = query(
      this.collectionRef,
      where('tenantId', '==', tenantId),
      orderBy('dueDate', 'desc'),
      limit(100)
    )

    return onSnapshot(q, (snapshot) => {
      const movements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialMovement))

      callback(movements)
    })
  }

  // Atualizar lembretes de cobrança
  async updateReminder(id: string): Promise<void> {
    const movement = await this.getById(id)
    if (!movement) return

    const now = new Date()
    const nextReminderDate = addDays(now, 3) // Próximo lembrete em 3 dias

    await this.update(id, {
      notes: `Lembrete enviado em ${now.toLocaleDateString()}`
    })

    await updateDoc(doc(this.collectionRef, id), {
      remindersSent: movement.remindersSent + 1,
      lastReminderDate: Timestamp.fromDate(now),
      nextReminderDate: Timestamp.fromDate(nextReminderDate)
    })
  }
}

// Instância única do serviço
export const financialMovementService = new FinancialMovementService()