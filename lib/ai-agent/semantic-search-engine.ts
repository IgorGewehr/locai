// lib/ai-agent/semantic-search-engine.ts
// Sistema de Busca Semântica com Embeddings - Estado da Arte da Indústria

import { OpenAI } from 'openai';
import { logger } from '@/lib/utils/logger';
import { Property } from '@/lib/types/property';

export interface SemanticSearchQuery {
  text: string;
  filters?: {
    location?: string;
    priceRange?: [number, number];
    guests?: number;
    amenities?: string[];
  };
  limit?: number;
  threshold?: number; // Similaridade mínima (0-1)
}

export interface PropertyEmbedding {
  propertyId: string;
  embedding: number[];
  text: string;
  metadata: {
    location: string;
    price: number;
    amenities: string[];
    features: string[];
  };
  lastUpdated: Date;
}

export interface SemanticSearchResult {
  property: Property;
  similarity: number;
  matchedFeatures: string[];
  relevanceScore: number;
}

export class SemanticSearchEngine {
  private openai: OpenAI;
  private static instance: SemanticSearchEngine;
  
  // Cache de embeddings em memória (produção usaria Redis/Vector DB)
  private embeddingsCache = new Map<string, PropertyEmbedding>();
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): SemanticSearchEngine {
    if (!this.instance) {
      this.instance = new SemanticSearchEngine();
    }
    return this.instance;
  }

  /**
   * Gerar embedding para texto usando OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Mais eficiente para busca
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('❌ [SemanticSearch] Erro ao gerar embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length
      });
      throw error;
    }
  }

  /**
   * Indexar propriedade no sistema de busca semântica
   */
  async indexProperty(property: Property): Promise<void> {
    try {
      // Criar texto rico para embedding
      const searchText = this.createPropertySearchText(property);
      
      // Gerar embedding
      const embedding = await this.generateEmbedding(searchText);
      
      // Criar registro de embedding
      const propertyEmbedding: PropertyEmbedding = {
        propertyId: property.id!,
        embedding,
        text: searchText,
        metadata: {
          location: `${property.neighborhood}, ${property.city}, ${property.state}`,
          price: property.pricing?.basePrice || 0,
          amenities: property.amenities || [],
          features: this.extractFeatures(property)
        },
        lastUpdated: new Date()
      };

      // Armazenar no cache (produção: Vector Database)
      this.embeddingsCache.set(property.id!, propertyEmbedding);

      logger.info('✅ [SemanticSearch] Propriedade indexada', {
        propertyId: property.id?.substring(0, 10) + '...',
        textLength: searchText.length,
        amenitiesCount: property.amenities?.length || 0
      });

    } catch (error) {
      logger.error('❌ [SemanticSearch] Erro ao indexar propriedade', {
        propertyId: property.id?.substring(0, 10) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Busca semântica avançada
   */
  async semanticSearch(
    query: SemanticSearchQuery,
    availableProperties: Property[]
  ): Promise<SemanticSearchResult[]> {
    try {
      logger.info('🔍 [SemanticSearch] Iniciando busca semântica', {
        query: query.text.substring(0, 50) + '...',
        hasFilters: !!query.filters,
        propertiesCount: availableProperties.length
      });

      // Garantir que propriedades estão indexadas
      await this.ensurePropertiesIndexed(availableProperties);

      // Gerar embedding da query
      const queryEmbedding = await this.generateEmbedding(query.text);

      // Calcular similaridades
      const results: SemanticSearchResult[] = [];
      
      for (const property of availableProperties) {
        const embeddingData = this.embeddingsCache.get(property.id!);
        if (!embeddingData) continue;

        // Calcular similaridade coseno
        const similarity = this.cosineSimilarity(queryEmbedding, embeddingData.embedding);
        
        // Aplicar threshold
        if (similarity < (query.threshold || 0.7)) continue;

        // Aplicar filtros tradicionais
        if (!this.passesFilters(property, query.filters)) continue;

        // Calcular score de relevância combinado
        const relevanceScore = this.calculateRelevanceScore(
          property, 
          similarity, 
          query.text, 
          embeddingData.metadata
        );

        // Identificar features que fizeram match
        const matchedFeatures = this.identifyMatchedFeatures(
          query.text, 
          embeddingData.text
        );

        results.push({
          property,
          similarity,
          matchedFeatures,
          relevanceScore
        });
      }

      // Ordenar por relevância
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Limitar resultados
      const limitedResults = results.slice(0, query.limit || 5);

      logger.info('✅ [SemanticSearch] Busca concluída', {
        totalMatches: results.length,
        returnedResults: limitedResults.length,
        avgSimilarity: results.length > 0 ? 
          (results.reduce((sum, r) => sum + r.similarity, 0) / results.length).toFixed(3) : 0
      });

      return limitedResults;

    } catch (error) {
      logger.error('❌ [SemanticSearch] Erro na busca semântica', {
        query: query.text.substring(0, 30),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback para busca tradicional
      return this.fallbackToTraditionalSearch(availableProperties, query);
    }
  }

  /**
   * Criar texto otimizado para busca semântica
   */
  private createPropertySearchText(property: Property): string {
    const parts = [
      // Informações básicas
      property.name,
      property.description,
      
      // Localização
      `Localizado em ${property.neighborhood}, ${property.city}, ${property.state}`,
      
      // Características
      `${property.bedrooms} quartos, ${property.bathrooms} banheiros`,
      `Acomoda até ${property.maxGuests} hóspedes`,
      
      // Tipo e categoria
      property.type,
      property.propertyCategory,
      
      // Amenidades
      property.amenities?.join(', '),
      
      // Preço e valor
      `Diária a partir de R$ ${property.pricing?.basePrice}`,
      
      // Features especiais
      property.features?.join(', '),
      
      // Palavras-chave para busca
      this.generateSearchKeywords(property)
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Extrair características para metadata
   */
  private extractFeatures(property: Property): string[] {
    const features = [];
    
    // Características do imóvel
    if (property.bedrooms) features.push(`${property.bedrooms} quartos`);
    if (property.bathrooms) features.push(`${property.bathrooms} banheiros`);
    if (property.maxGuests) features.push(`${property.maxGuests} hóspedes`);
    
    // Amenidades importantes
    if (property.amenities?.includes('Wi-Fi')) features.push('internet');
    if (property.amenities?.includes('Ar condicionado')) features.push('climatizado');
    if (property.amenities?.includes('Piscina')) features.push('piscina');
    if (property.amenities?.includes('Garagem')) features.push('estacionamento');
    
    // Localização
    if (property.neighborhood) features.push(property.neighborhood.toLowerCase());
    if (property.city) features.push(property.city.toLowerCase());
    
    return features;
  }

  /**
   * Gerar palavras-chave para busca
   */
  private generateSearchKeywords(property: Property): string {
    const keywords = [];
    
    // Baseado no tipo
    if (property.type?.toLowerCase().includes('apartamento')) {
      keywords.push('apartamento', 'ap', 'flat', 'studio');
    }
    if (property.type?.toLowerCase().includes('casa')) {
      keywords.push('casa', 'residência', 'moradia');
    }
    
    // Baseado na localização
    if (property.city?.toLowerCase().includes('florianópolis')) {
      keywords.push('floripa', 'ilha da magia', 'sc', 'santa catarina');
    }
    
    // Baseado nas amenidades
    if (property.amenities?.some(a => a.toLowerCase().includes('praia'))) {
      keywords.push('praia', 'mar', 'litoral', 'orla');
    }
    
    return keywords.join(', ');
  }

  /**
   * Calcular similaridade coseno entre vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Verificar se propriedade passa pelos filtros
   */
  private passesFilters(property: Property, filters?: SemanticSearchQuery['filters']): boolean {
    if (!filters) return true;
    
    // Filtro de localização
    if (filters.location) {
      const location = filters.location.toLowerCase();
      const propertyLocation = `${property.city} ${property.neighborhood} ${property.state}`.toLowerCase();
      if (!propertyLocation.includes(location)) return false;
    }
    
    // Filtro de preço
    if (filters.priceRange) {
      const price = property.pricing?.basePrice || 0;
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
    }
    
    // Filtro de hóspedes
    if (filters.guests) {
      if ((property.maxGuests || 0) < filters.guests) return false;
    }
    
    // Filtro de amenidades
    if (filters.amenities && filters.amenities.length > 0) {
      const propertyAmenities = (property.amenities || []).map(a => a.toLowerCase());
      const hasAllAmenities = filters.amenities.every(amenity => 
        propertyAmenities.some(pa => pa.includes(amenity.toLowerCase()))
      );
      if (!hasAllAmenities) return false;
    }
    
    return true;
  }

  /**
   * Calcular score de relevância combinado
   */
  private calculateRelevanceScore(
    property: Property,
    similarity: number,
    query: string,
    metadata: PropertyEmbedding['metadata']
  ): number {
    let score = similarity * 0.7; // 70% baseado na similaridade semântica
    
    // Boost para matches exatos na localização
    const queryLower = query.toLowerCase();
    if (queryLower.includes(property.city?.toLowerCase() || '')) {
      score += 0.1;
    }
    
    // Boost para amenidades mencionadas
    const mentionedAmenities = metadata.amenities.filter(amenity =>
      queryLower.includes(amenity.toLowerCase())
    );
    score += mentionedAmenities.length * 0.05;
    
    // Penalty para preços muito altos (assumindo que mais barato é melhor)
    const avgPrice = 300; // Preço médio estimado
    if (metadata.price > avgPrice * 2) {
      score -= 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Identificar features que fizeram match
   */
  private identifyMatchedFeatures(query: string, propertyText: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const propertyWords = propertyText.toLowerCase().split(/\s+/);
    
    const matches = queryWords.filter(word => 
      word.length > 3 && propertyWords.some(pw => pw.includes(word))
    );
    
    return [...new Set(matches)]; // Remove duplicatas
  }

  /**
   * Garantir que propriedades estão indexadas
   */
  private async ensurePropertiesIndexed(properties: Property[]): Promise<void> {
    const unindexedProperties = properties.filter(p => 
      !this.embeddingsCache.has(p.id!)
    );
    
    if (unindexedProperties.length > 0) {
      logger.info('📚 [SemanticSearch] Indexando propriedades faltantes', {
        count: unindexedProperties.length
      });
      
      // Indexar em paralelo (com limite para não sobrecarregar API)
      const batchSize = 3;
      for (let i = 0; i < unindexedProperties.length; i += batchSize) {
        const batch = unindexedProperties.slice(i, i + batchSize);
        await Promise.all(batch.map(p => this.indexProperty(p)));
        
        // Pequena pausa entre batches
        if (i + batchSize < unindexedProperties.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }

  /**
   * Fallback para busca tradicional
   */
  private fallbackToTraditionalSearch(
    properties: Property[], 
    query: SemanticSearchQuery
  ): SemanticSearchResult[] {
    logger.warn('⚠️ [SemanticSearch] Usando fallback para busca tradicional');
    
    return properties
      .filter(p => this.passesFilters(p, query.filters))
      .slice(0, query.limit || 5)
      .map(property => ({
        property,
        similarity: 0.5, // Score neutro
        matchedFeatures: [],
        relevanceScore: 0.5
      }));
  }

  /**
   * Limpar cache de embeddings
   */
  clearCache(): void {
    this.embeddingsCache.clear();
    logger.info('🧹 [SemanticSearch] Cache de embeddings limpo');
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats(): {
    totalEmbeddings: number;
    cacheSize: string;
    oldestEntry: Date | null;
  } {
    const entries = Array.from(this.embeddingsCache.values());
    
    return {
      totalEmbeddings: entries.length,
      cacheSize: `${Math.round(entries.length * 1536 * 4 / 1024 / 1024 * 100) / 100} MB`, // Estimativa
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.lastUpdated.getTime()))) : null
    };
  }
}

export const semanticSearchEngine = SemanticSearchEngine.getInstance();