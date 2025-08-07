import { auth } from '@/lib/firebase/config';

/**
 * API client with automatic token injection
 */
export class ApiClient {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    
    return {
      'Content-Type': 'application/json',
    };
  }

  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = await this.getAuthHeaders();
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    return fetch(url, config);
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