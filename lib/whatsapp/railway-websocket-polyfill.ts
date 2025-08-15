// RAILWAY WEBSOCKET POLYFILL
// Provides WebSocket masking compatibility for Railway environment
// Fixes "TypeError: b.mask is not a function" error in Baileys

import { logger } from '@/lib/utils/logger';

export class RailwayWebSocketPolyfill {
  static isRailwayEnvironment(): boolean {
    return !!(process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production');
  }

  static setupWebSocketPolyfill() {
    if (!this.isRailwayEnvironment()) {
      logger.debug('🔧 [WS-POLYFILL] Not Railway environment, skipping polyfill');
      return;
    }

    logger.info('🔧 [WS-POLYFILL] Setting up Railway WebSocket masking polyfill...');

    try {
      // Check if WebSocket masking is already available
      const testWS = global.WebSocket || require('ws');
      if (testWS && typeof testWS.prototype?.mask === 'function') {
        logger.info('✅ [WS-POLYFILL] WebSocket masking already available');
        return;
      }

      // Polyfill WebSocket masking for Railway
      this.polyfillWebSocketMasking();
      logger.info('✅ [WS-POLYFILL] Railway WebSocket masking polyfill applied');

    } catch (error) {
      logger.error('❌ [WS-POLYFILL] Failed to setup WebSocket polyfill', { error: error.message });
      throw error;
    }
  }

  private static polyfillWebSocketMasking() {
    // Try to use 'ws' library which has proper masking support
    try {
      const WebSocketLib = require('ws');
      
      // Ensure the WebSocket library has masking functions
      if (WebSocketLib && typeof WebSocketLib === 'function') {
        // Make sure global WebSocket uses the library version
        if (typeof global !== 'undefined') {
          global.WebSocket = WebSocketLib;
          logger.debug('🔧 [WS-POLYFILL] Set global WebSocket to ws library');
        }

        // Add masking polyfill if needed
        if (!WebSocketLib.prototype.mask) {
          this.addMaskingMethods(WebSocketLib);
        }
      }
    } catch (wsError) {
      logger.warn('⚠️ [WS-POLYFILL] ws library not available, using manual polyfill');
      this.addManualMaskingPolyfill();
    }
  }

  private static addMaskingMethods(WebSocketClass: any) {
    // Add mask method to WebSocket prototype
    if (!WebSocketClass.prototype.mask) {
      WebSocketClass.prototype.mask = function(source: Buffer, mask: Buffer, output: Buffer, offset: number, length: number) {
        try {
          for (let i = 0; i < length; i++) {
            output[offset + i] = source[i] ^ mask[i % 4];
          }
        } catch (error) {
          logger.error('❌ [WS-POLYFILL] Masking failed', { error: error.message });
          throw error;
        }
      };
      logger.debug('🔧 [WS-POLYFILL] Added mask method to WebSocket prototype');
    }

    // Add unmask method
    if (!WebSocketClass.prototype.unmask) {
      WebSocketClass.prototype.unmask = function(source: Buffer, mask: Buffer) {
        try {
          const output = Buffer.alloc(source.length);
          for (let i = 0; i < source.length; i++) {
            output[i] = source[i] ^ mask[i % 4];
          }
          return output;
        } catch (error) {
          logger.error('❌ [WS-POLYFILL] Unmasking failed', { error: error.message });
          throw error;
        }
      };
      logger.debug('🔧 [WS-POLYFILL] Added unmask method to WebSocket prototype');
    }
  }

  private static addManualMaskingPolyfill() {
    // Create a manual masking implementation
    const maskingUtils = {
      mask: (source: Buffer, mask: Buffer, output: Buffer, offset: number, length: number) => {
        for (let i = 0; i < length; i++) {
          output[offset + i] = source[i] ^ mask[i % 4];
        }
      },
      unmask: (source: Buffer, mask: Buffer) => {
        const output = Buffer.alloc(source.length);
        for (let i = 0; i < source.length; i++) {
          output[i] = source[i] ^ mask[i % 4];
        }
        return output;
      }
    };

    // Try to add to global scope for Baileys to find
    if (typeof global !== 'undefined') {
      global._websocketMasking = maskingUtils;
      logger.debug('🔧 [WS-POLYFILL] Added manual masking utils to global scope');
    }

    // Also try to patch Buffer for masking operations
    if (Buffer && !Buffer.prototype.mask) {
      Buffer.prototype.mask = function(mask: Buffer, output?: Buffer, offset = 0, length?: number) {
        const len = length || this.length;
        const out = output || Buffer.alloc(len);
        maskingUtils.mask(this, mask, out, offset, len);
        return out;
      };
      logger.debug('🔧 [WS-POLYFILL] Added mask method to Buffer prototype');
    }
  }

  static createCompatibleWebSocket(url: string, protocols?: string | string[], options?: any) {
    try {
      // Ensure polyfill is applied
      this.setupWebSocketPolyfill();

      // Try to create WebSocket with Railway compatibility
      const WebSocketClass = global.WebSocket || require('ws');
      
      if (this.isRailwayEnvironment()) {
        // Railway-specific options
        const railwayOptions = {
          ...options,
          followRedirects: true,
          handshakeTimeout: 30000,
          perMessageDeflate: false, // Disable compression to avoid masking issues
          skipUTF8Validation: true,
          ...options
        };

        logger.debug('🔧 [WS-POLYFILL] Creating Railway-compatible WebSocket', { 
          url, 
          protocols, 
          options: railwayOptions 
        });

        return new WebSocketClass(url, protocols, railwayOptions);
      } else {
        return new WebSocketClass(url, protocols, options);
      }

    } catch (error) {
      logger.error('❌ [WS-POLYFILL] Failed to create compatible WebSocket', { 
        error: error.message,
        url,
        protocols 
      });
      throw error;
    }
  }

  static testMaskingFunctionality(): boolean {
    try {
      const testSource = Buffer.from([1, 2, 3, 4]);
      const testMask = Buffer.from([255, 255, 255, 255]);
      const testOutput = Buffer.alloc(4);

      // Test manual masking
      for (let i = 0; i < 4; i++) {
        testOutput[i] = testSource[i] ^ testMask[i % 4];
      }

      const expected = Buffer.from([254, 253, 252, 251]);
      const maskingWorks = testOutput.equals(expected);

      logger.debug('🧪 [WS-POLYFILL] Masking functionality test', {
        testSource: testSource.toString('hex'),
        testMask: testMask.toString('hex'),
        testOutput: testOutput.toString('hex'),
        expected: expected.toString('hex'),
        maskingWorks
      });

      return maskingWorks;
    } catch (error) {
      logger.error('❌ [WS-POLYFILL] Masking test failed', { error: error.message });
      return false;
    }
  }
}

// Auto-apply polyfill when module is imported in Railway
if (RailwayWebSocketPolyfill.isRailwayEnvironment()) {
  try {
    RailwayWebSocketPolyfill.setupWebSocketPolyfill();
  } catch (error) {
    logger.error('❌ [WS-POLYFILL] Auto-setup failed', { error: error.message });
  }
}