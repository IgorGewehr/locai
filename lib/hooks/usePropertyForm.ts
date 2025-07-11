// lib/hooks/usePropertyForm.ts
import { useState, useCallback } from 'react'
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Property } from '@/lib/types/property'

export interface UsePropertyFormReturn {
  submitProperty: (property: Property) => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
  success: boolean
  clearSuccess: () => void
}

export function usePropertyForm(tenantId: string): UsePropertyFormReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submitProperty = useCallback(async (property: Property) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const now = new Date()
      const propertyData = {
        ...property,
        tenantId,
        updatedAt: now,
      }

      if (property.id) {
        // Update existing property
        await updateDoc(doc(db, 'properties', property.id), propertyData)
      } else {
        // Create new property
        const newDoc = doc(collection(db, 'properties'))
        await setDoc(newDoc, {
          ...propertyData,
          id: newDoc.id,
          createdAt: now,
        })
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar propriedade')
      throw err
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearSuccess = useCallback(() => {
    setSuccess(false)
  }, [])

  return {
    submitProperty,
    loading,
    error,
    clearError,
    success,
    clearSuccess,
  }
}