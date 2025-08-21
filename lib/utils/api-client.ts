import { auth } from '@/lib/firebase/config';

/**
 * API client with automatic token injection
 */
export class ApiClient {
  private static tokenCache: { token: string; expiry: number; email: string } | null = null;
  private static isProduction = process.env.NODE_ENV === 'production';
  private static debug = process.env.NEXT_PUBLIC_DEBUG_API === 'true';
  
  private static async getAuthHeaders(): Promise<HeadersInit> {
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        if (this.debug) console.warn('⚠️ [ApiClient] No authenticated user found');
        this.tokenCache = null;
        return {
          'Content-Type': 'application/json',
        };
      }

      const currentEmail = auth.currentUser.email;
      const now = Date.now();
      
      // Check if we have a valid cached token
      if (this.tokenCache && 
          this.tokenCache.expiry > now + 60000 && // 1 minute buffer
          this.tokenCache.email === currentEmail) {
        if (this.debug) console.log('🔄 [ApiClient] Using cached token for user:', currentEmail);
        return {
          'Authorization': `Bearer ${this.tokenCache.token}`,
          'Content-Type': 'application/json',
        };
      }

      // Get fresh token with multiple retry strategies
      let token = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (this.debug) console.log(`🔄 [ApiClient] Getting token attempt ${attempt}/${maxRetries} for user:`, currentEmail);
          
          // Strategy 1: Force refresh
          if (attempt === 1) {
            token = await auth.currentUser.getIdToken(true);
          }
          // Strategy 2: Use cached token
          else if (attempt === 2) {
            token = await auth.currentUser.getIdToken(false);
          }
          // Strategy 3: Wait and force refresh again
          else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            token = await auth.currentUser.getIdToken(true);
          }
          
          if (token && token.length > 100) {
            // Parse token to get expiry (basic JWT parsing)
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const expiry = (payload.exp || 0) * 1000; // Convert to milliseconds
              
              // Cache the token
              this.tokenCache = {
                token,
                expiry,
                email: currentEmail || 'unknown'
              };
              
              if (this.debug) {
                console.log('✅ [ApiClient] Fresh token obtained for user:', currentEmail, {
                  tokenLength: token.length,
                  expiresIn: Math.round((expiry - now) / 1000 / 60) + ' minutes'
                });
              }
              
              return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              };
            } catch (parseError) {
              console.warn('⚠️ [ApiClient] Could not parse token expiry, using anyway:', parseError);
              
              // Use token anyway with shorter cache time
              this.tokenCache = {
                token,
                expiry: now + (30 * 60 * 1000), // 30 minutes
                email: currentEmail || 'unknown'
              };
              
              return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              };
            }
          }
        } catch (attemptError) {
          console.warn(`⚠️ [ApiClient] Token attempt ${attempt} failed:`, attemptError);
          
          if (attempt === maxRetries) {
            throw attemptError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
      
      throw new Error('All token acquisition attempts failed');
      
    } catch (error) {
      console.error('❌ [ApiClient] Failed to get auth token after all retries:', {
        error: error.message,
        user: auth.currentUser?.email,
        uid: auth.currentUser?.uid
      });
      
      this.tokenCache = null;
      
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get fresh headers for each attempt
        const headers = await this.getAuthHeaders();
        
        const config: RequestInit = {
          ...options,
          headers: {
            ...headers,
            ...options.headers,
          },
        };

        if (this.debug) console.log(`🌐 [ApiClient] Making request attempt ${attempt}/${maxRetries} to:`, url);
        
        const response = await fetch(url, config);
        
        // If we get 401 and this isn't the last attempt, clear token cache and retry
        if (response.status === 401 && attempt < maxRetries) {
          console.warn(`🔄 [ApiClient] Got 401 on attempt ${attempt}, clearing token cache and retrying...`);
          this.tokenCache = null; // Clear cache to force fresh token
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // Log response status for debugging
        if (!response.ok) {
          console.warn(`⚠️ [ApiClient] Request failed with status ${response.status} on attempt ${attempt}`);
        } else {
          if (this.debug) console.log(`✅ [ApiClient] Request successful on attempt ${attempt}`);
        }
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ [ApiClient] Request attempt ${attempt} failed:`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    
    // If we get here, all attempts failed
    const finalError = lastError || new Error('All request attempts failed');
    console.error('💥 [ApiClient] All request attempts failed:', {
      url,
      attempts: maxRetries,
      lastError: finalError.message
    });
    
    throw finalError;
  }

  static async get(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  static async post(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

// Helper function for backward compatibility
export const apiClient = ApiClient;