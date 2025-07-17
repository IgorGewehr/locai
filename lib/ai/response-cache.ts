import { createHash } from 'crypto'
import { AIResponse } from '@/lib/types/ai'

interface CacheEntry {
  response: AIResponse
  timestamp: Date
  hits: number
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000
  private ttl = 1000 * 60 * 30 // 30 minutos

  private generateKey(content: string, context: any): string {
    const normalized = content.toLowerCase().trim()
    const contextKey = JSON.stringify(context)
    return createHash('md5').update(normalized + contextKey).digest('hex')
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp.getTime() > this.ttl
  }

  private cleanup(): void {
    const entries = Array.from(this.cache.entries())
    
    // Remove entradas expiradas
    entries.forEach(([key, entry]) => {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    })

    // Se ainda estiver acima do limite, remove as menos usadas
    if (this.cache.size > this.maxSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, this.cache.size - this.maxSize)
      
      sortedEntries.forEach(([key]) => this.cache.delete(key))
    }
  }

  get(content: string, context: any): AIResponse | null {
    const key = this.generateKey(content, context)
    const entry = this.cache.get(key)

    if (!entry || this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    entry.hits++
    return entry.response
  }

  set(content: string, context: any, response: AIResponse): void {
    const key = this.generateKey(content, context)
    
    this.cache.set(key, {
      response,
      timestamp: new Date(),
      hits: 1
    })

    if (this.cache.size > this.maxSize) {
      this.cleanup()
    }
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): { size: number; hitRate: number } {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0)
    const hitRate = totalHits > 0 ? (totalHits / this.cache.size) : 0
    
    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }
}

export const responseCache = new ResponseCache()