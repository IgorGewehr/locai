import { OpenAI } from 'openai'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { withTimeout, withRetry } from '@/lib/utils/async'
import { ValidationError, NetworkError } from '@/lib/utils/errors'
import { validateMessageContent } from '@/lib/utils/validation'

interface AudioMetrics {
  transcriptionTime: number
  audioLength: number
  confidence: number
  language: string
  processingCost: number
}

interface AudioPreferences {
  preferAudioResponses: boolean
  voiceSpeed: number
  voiceModel: 'tts-1' | 'tts-1-hd'
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
}

export class TranscriptionService {
  private openai: OpenAI
  private whatsappClient: WhatsAppClient
  private audioCache: Map<string, string> = new Map()
  private readonly MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB WhatsApp limit
  private readonly MAX_AUDIO_DURATION = 300 // 5 minutes

  constructor(whatsappClient: WhatsAppClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for audio processing')
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.whatsappClient = whatsappClient

    }

  /**
   * Transcribe WhatsApp audio message with professional error handling and caching
   */
  async transcribeAudio(audioId: string, clientPhone?: string): Promise<{
    text: string
    metrics: AudioMetrics
    cached: boolean
  }> {
    const startTime = Date.now()

    try {
      // Check cache first
      const cached = this.audioCache.get(audioId)
      if (cached) {
        return {
          text: cached,
          metrics: {
            transcriptionTime: 0,
            audioLength: 0,
            confidence: 1.0,
            language: 'pt',
            processingCost: 0
          },
          cached: true
        }
      }

      // 1. Get audio file details from WhatsApp
      const mediaDetails = await withTimeout(
        this.whatsappClient.getMediaDetails(audioId),
        10000,
        'Get audio media details'
      )

      // 2. Validate media details
      await this.validateAudioMedia(mediaDetails)

      // 3. Download audio file with retry
      const audioBuffer = await withRetry(
        () => withTimeout(
          this.whatsappClient.downloadMedia(mediaDetails.url),
          20000,
          'Download audio file'
        ),
        3,
        2000
      )

      // 4. Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new ValidationError('Audio file is empty or corrupted', 'audioFile')
      }

      if (audioBuffer.length > this.MAX_AUDIO_SIZE) {
        throw new ValidationError(
          `Audio file too large: ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB. Max: 25MB`,
          'audioSize'
        )
      }

      // TODO: Add proper logging - Processing audio file size

      // 5. Transcribe using OpenAI Whisper with enhanced parameters
      const transcriptionResult = await withRetry(
        async () => {
          // Convert buffer to File object with proper MIME type
          const audioFile = new File(
            [audioBuffer], 
            `audio_${audioId}.${this.getFileExtension(mediaDetails.mime_type)}`, 
            { type: mediaDetails.mime_type || 'audio/ogg' }
          )

          return await withTimeout(
            this.openai.audio.transcriptions.create({
              file: audioFile,
              model: 'whisper-1',
              language: 'pt', // Portuguese
              response_format: 'verbose_json', // Get detailed response
              temperature: 0, // Maximum accuracy
              prompt: 'Esta é uma conversa sobre imóveis, locações, reservas, preços e propriedades para temporada.' // Context hint
            }),
            45000, // 45 seconds timeout for audio processing
            'OpenAI Whisper transcription'
          )
        },
        2, // Only 2 retries for expensive operations
        3000
      )

      // 6. Process and validate transcription
      const rawText = typeof transcriptionResult === 'string' 
        ? transcriptionResult 
        : transcriptionResult.text

      const cleanedText = this.cleanTranscription(rawText)
      const metrics: AudioMetrics = {
        transcriptionTime: Date.now() - startTime,
        audioLength: typeof transcriptionResult === 'object' ? transcriptionResult.duration || 0 : 0,
        confidence: this.calculateConfidence(cleanedText, rawText),
        language: typeof transcriptionResult === 'object' ? transcriptionResult.language || 'pt' : 'pt',
        processingCost: this.calculateProcessingCost(audioBuffer.length)
      }

      if (!cleanedText || cleanedText.length < 3) {
        return {
          text: 'Não consegui entender claramente o áudio. Poderia repetir de forma mais clara ou enviar por texto? 😊',
          metrics,
          cached: false
        }
      }

      // 7. Cache successful transcription
      this.audioCache.set(audioId, cleanedText)

      // 8. Log successful transcription
      // TODO: Add proper logging - Transcription completed successfully

      // 9. Optional: Save transcription metrics for analytics
      await this.saveTranscriptionMetrics(audioId, clientPhone, metrics)

      return {
        text: cleanedText,
        metrics,
        cached: false
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      // Classify error and provide appropriate fallback
      if (error instanceof ValidationError) {
        return {
          text: `Problema com o áudio: ${error.message}. Tente enviar novamente ou use texto. 🎤`,
          metrics: {
            transcriptionTime: processingTime,
            audioLength: 0,
            confidence: 0,
            language: 'pt',
            processingCost: 0
          },
          cached: false
        }
      }

      if (error instanceof NetworkError || error.message?.includes('timeout')) {
        return {
          text: 'Tive dificuldades para processar seu áudio devido à conexão. Pode tentar novamente ou enviar por texto? 📱',
          metrics: {
            transcriptionTime: processingTime,
            audioLength: 0,
            confidence: 0,
            language: 'pt',
            processingCost: 0
          },
          cached: false
        }
      }

      // Generic fallback for unknown errors
      return {
        text: 'Recebi seu áudio! Para garantir que eu entenda perfeitamente, pode enviar sua mensagem por texto? Assim posso te ajudar da melhor forma! 😊',
        metrics: {
          transcriptionTime: processingTime,
          audioLength: 0,
          confidence: 0,
          language: 'pt',
          processingCost: 0
        },
        cached: false
      }
    }
  }

  /**
   * Generate professional audio response with customization
   */
  async generateAudioResponse(
    text: string, 
    preferences?: AudioPreferences,
    clientPhone?: string
  ): Promise<{
    audioBuffer: Buffer | null
    metadata: {
      duration: number
      size: number
      cost: number
      voice: string
      model: string
    }
  }> {
    const startTime = Date.now()

    try {
      // Use default preferences if not provided
      const audioPrefs: AudioPreferences = {
        preferAudioResponses: true,
        voiceSpeed: 1.0,
        voiceModel: 'tts-1',
        voice: 'nova', // Professional female voice
        ...preferences
      }

      // Prepare text for TTS
      const cleanText = this.prepareTextForTTS(text)

      if (!cleanText || cleanText.length < 5) {
        return {
          audioBuffer: null,
          metadata: {
            duration: 0,
            size: 0,
            cost: 0,
            voice: audioPrefs.voice,
            model: audioPrefs.voiceModel
          }
        }
      }

      // TODO: Add proper logging - Generating TTS audio response

      // Generate audio response using OpenAI TTS
      const audioResponse = await withRetry(
        () => withTimeout(
          this.openai.audio.speech.create({
            model: audioPrefs.voiceModel,
            voice: audioPrefs.voice,
            input: cleanText,
            response_format: 'mp3',
            speed: audioPrefs.voiceSpeed
          }),
          40000, // 40 seconds timeout for TTS
          'Generate TTS audio'
        ),
        2,
        2000
      )

      const arrayBuffer = await audioResponse.arrayBuffer()
      const audioBuffer = Buffer.from(arrayBuffer)

      const processingTime = Date.now() - startTime
      const estimatedDuration = cleanText.length / 15 // Rough estimate: 15 chars per second
      const estimatedCost = cleanText.length * 0.000015 // OpenAI TTS pricing

      const metadata = {
        duration: estimatedDuration,
        size: audioBuffer.length,
        cost: estimatedCost,
        voice: audioPrefs.voice,
        model: audioPrefs.voiceModel
      }

      // TODO: Add proper logging - Generated audio response size

      // Log for analytics
      this.logAudioGeneration(clientPhone, metadata, processingTime)

      return {
        audioBuffer,
        metadata
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      return {
        audioBuffer: null,
        metadata: {
          duration: 0,
          size: 0,
          cost: 0,
          voice: preferences?.voice || 'nova',
          model: preferences?.voiceModel || 'tts-1'
        }
      }
    }
  }

  /**
   * Advanced text cleaning and normalization for transcriptions
   */
  private cleanTranscription(text: string): string {
    if (typeof text !== 'string' || !text) {
      return ''
    }

    return text
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\b(um|eh|ah|né|ã|hmm)\b/gi, '') // Remove filler words
      .replace(/[^\w\s\-.,!?áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '') // Keep Portuguese chars
      .replace(/\s+([.,!?])/g, '$1') // Fix spacing before punctuation
      .replace(/([.,!?])([^\s])/g, '$1 $2') // Fix spacing after punctuation
      .replace(/^[.,!?\s]+|[.,!?\s]+$/g, '') // Remove leading/trailing punctuation
      .slice(0, 1000) // Limit length
      .trim()
  }

  /**
   * Validate audio media before processing
   */
  private async validateAudioMedia(mediaDetails: any): Promise<void> {
    if (!mediaDetails) {
      throw new ValidationError('No media details received from WhatsApp', 'mediaDetails')
    }

    if (!mediaDetails.url) {
      throw new ValidationError('No media URL provided', 'mediaUrl')
    }

    // Check if it's actually an audio file
    const audioMimeTypes = [
      'audio/ogg',
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/aac',
      'audio/webm'
    ]

    if (mediaDetails.mime_type && !audioMimeTypes.includes(mediaDetails.mime_type)) {
      throw new ValidationError(
        `Unsupported audio format: ${mediaDetails.mime_type}`, 
        'audioFormat'
      )
    }

    // Check file size if available
    if (mediaDetails.file_size && mediaDetails.file_size > this.MAX_AUDIO_SIZE) {
      throw new ValidationError(
        `Audio file too large: ${(mediaDetails.file_size / 1024 / 1024).toFixed(1)}MB`, 
        'audioSize'
      )
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getFileExtension(mimeType?: string): string {
    const extensions: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/aac': 'aac',
      'audio/webm': 'webm'
    }

    return extensions[mimeType || ''] || 'ogg'
  }

  /**
   * Calculate transcription confidence based on various factors
   */
  private calculateConfidence(cleanedText: string, rawText: string): number {
    if (!cleanedText || cleanedText.length < 3) {
      return 0
    }

    let confidence = 0.8 // Base confidence

    // Length factor
    if (cleanedText.length > 10) confidence += 0.1
    if (cleanedText.length > 50) confidence += 0.1

    // Word count factor
    const words = cleanedText.split(' ').filter(w => w.length > 2)
    if (words.length > 3) confidence += 0.1

    // Cleaning factor (how much was cleaned)
    const cleaningRatio = cleanedText.length / rawText.length
    if (cleaningRatio > 0.8) confidence += 0.1

    // Real estate keywords boost confidence
    const realEstateKeywords = [
      'casa', 'apartamento', 'propriedade', 'aluguel', 'locação', 
      'reserva', 'hospedagem', 'diária', 'preço', 'disponível',
      'quartos', 'banheiros', 'piscina', 'praia', 'centro'
    ]

    const keywordMatches = realEstateKeywords.filter(keyword => 
      cleanedText.toLowerCase().includes(keyword)
    ).length

    confidence += Math.min(keywordMatches * 0.05, 0.2)

    return Math.min(confidence, 1.0)
  }

  /**
   * Calculate processing cost for analytics
   */
  private calculateProcessingCost(audioSizeBytes: number): number {
    // Rough estimate: OpenAI Whisper costs ~$0.006 per minute
    // Assume ~1MB per minute for compressed audio
    const estimatedMinutes = audioSizeBytes / (1024 * 1024)
    return estimatedMinutes * 0.006
  }

  /**
   * Prepare text for optimal TTS output
   */
  private prepareTextForTTS(text: string): string {
    if (!text || typeof text !== 'string') {
      return ''
    }

    return text
      .trim()
      .replace(/\*([^*]+)\*/g, '$1') // Remove markdown bold
      .replace(/\n+/g, '. ') // Convert line breaks to periods
      .replace(/https?:\/\/[^\s]+/g, 'link') // Replace URLs
      .replace(/\b(R\$|USD|EUR)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g, '$2 $1') // Fix currency reading
      .replace(/([0-9]+)([kmKM])\b/g, '$1 mil') // Fix number abbreviations
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .slice(0, 4000) // TTS character limit
      .trim()
  }

  /**
   * Save transcription metrics for analytics (optional)
   */
  private async saveTranscriptionMetrics(
    audioId: string, 
    clientPhone?: string, 
    metrics?: AudioMetrics
  ): Promise<void> {
    try {
      // This could save to Firebase for analytics
      // For now, just log for monitoring
      // TODO: Add proper logging - Transcription metrics saved
    } catch (error) {
      // Don't fail transcription if analytics fails
      // TODO: Add proper logging - Failed to save transcription metrics
    }
  }

  /**
   * Log audio generation for analytics
   */
  private logAudioGeneration(
    clientPhone?: string, 
    metadata?: any, 
    processingTime?: number
  ): void {
    try {
      // TODO: Add proper logging - Audio generation logged
    } catch (error) {
      // TODO: Add proper logging - Failed to log audio generation
    }
  }

  /**
   * Clear transcription cache (for memory management)
   */
  clearCache(): void {
    this.audioCache.clear()
    // TODO: Add proper logging - Audio transcription cache cleared
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.audioCache.size,
      keys: Array.from(this.audioCache.keys())
    }
  }

  /**
   * Determine if client prefers audio responses based on their behavior
   */
  shouldGenerateAudioResponse(
    clientPhone: string, 
    conversationHistory: any[],
    preferences?: AudioPreferences
  ): boolean {
    // If explicitly set in preferences
    if (preferences?.preferAudioResponses !== undefined) {
      return preferences.preferAudioResponses
    }

    // Check if client has sent audio messages recently
    const recentAudioMessages = conversationHistory
      .filter(msg => msg.type === 'audio' && !msg.isFromAI)
      .slice(-5) // Last 5 messages

    // If client sent 2+ audio messages in recent history, they likely prefer audio
    return recentAudioMessages.length >= 2
  }
}

// Export default preferences for audio processing
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  preferAudioResponses: false, // Default to text unless client requests audio
  voiceSpeed: 1.0,
  voiceModel: 'tts-1', // Standard quality for cost efficiency
  voice: 'nova' // Professional female voice
}

// Export voice options for configuration
export const VOICE_OPTIONS = {
  nova: { name: 'Nova', description: 'Voz feminina profissional e clara' },
  alloy: { name: 'Alloy', description: 'Voz neutra e versátil' },
  echo: { name: 'Echo', description: 'Voz masculina profissional' },
  fable: { name: 'Fable', description: 'Voz masculina expressiva' },
  onyx: { name: 'Onyx', description: 'Voz masculina grave' },
  shimmer: { name: 'Shimmer', description: 'Voz feminina suave' }
} as const

// Export interface for external usage
export type { AudioPreferences, AudioMetrics }