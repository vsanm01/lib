/**
 * Google Sheets Secure API Library
 * Version: 1.0.0
 * 
 * A reusable library for making secure API requests to Google Sheets
 * with HMAC authentication and proper security headers.
 * 
 * Dependencies: CryptoJS (https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js)
 * 
 * Usage:
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
 * <script src="path/to/gs-secure-api.js"></script>
 * <script>
 *   const gsAPI = new GoogleSheetsSecureAPI({
 *     scriptUrl: 'YOUR_GOOGLE_APPS_SCRIPT_URL',
 *     apiToken: 'YOUR_API_TOKEN',
 *     hmacSecret: 'YOUR_HMAC_SECRET',
 *     debug: false
 *   });
 *   
 *   gsAPI.request({ action: 'getData', sheet: 'Sheet1' })
 *     .then(data => console.log(data))
 *     .catch(error => console.error(error));
 * </script>
 */

(function(global) {
  'use strict';

  /**
   * Google Sheets Secure API Class
   */
  class GoogleSheetsSecureAPI {
    constructor(config = {}) {
      this.config = {
        scriptUrl: config.scriptUrl || '',
        apiToken: config.apiToken || '',
        hmacSecret: config.hmacSecret || '',
        debug: config.debug || false,
        timeout: config.timeout || 30000
      };

      this.validateConfig();
    }

    /**
     * Validate configuration
     */
    validateConfig() {
      if (!this.config.scriptUrl) {
        console.warn('GoogleSheetsSecureAPI: scriptUrl not configured');
      }
      if (!this.config.apiToken) {
        console.warn('GoogleSheetsSecureAPI: apiToken not configured');
      }
      if (!this.config.hmacSecret) {
        console.warn('GoogleSheetsSecureAPI: hmacSecret not configured');
      }
      
      if (typeof CryptoJS === 'undefined') {
        throw new Error('CryptoJS is required. Please include: https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
      }
    }

    /**
     * Update configuration
     */
    configure(config) {
      this.config = { ...this.config, ...config };
      this.validateConfig();
    }

    /**
     * Compute HMAC-SHA256 signature
     */
    computeHMAC(params, secret) {
      return CryptoJS.HmacSHA256(params, secret).toString();
    }

    /**
     * Create signature from parameters
     */
    createSignature(params, secret) {
      const sortedKeys = Object.keys(params).sort();
      const signatureString = sortedKeys
        .map(key => `${key}=${params[key]}`)
        .join('&');
      return this.computeHMAC(signatureString, secret);
    }

    /**
     * Make a secure API request
     */
    async request(params = {}) {
      if (!this.config.scriptUrl || !this.config.apiToken || !this.config.hmacSecret) {
        const error = new Error('API configuration incomplete. Please set scriptUrl, apiToken, and hmacSecret.');
        console.error('GoogleSheetsSecureAPI:', error.message);
        throw error;
      }

      try {
        // Add required security parameters
        const requestParams = {
          ...params,
          token: this.config.apiToken,
          timestamp: Date.now().toString(),
          referrer: window.location.origin,
          origin: window.location.origin
        };

        // Create HMAC signature
        requestParams.signature = this.createSignature(requestParams, this.config.hmacSecret);

        // Build URL with query parameters
        const url = new URL(this.config.scriptUrl);
        Object.keys(requestParams).forEach(key => {
          url.searchParams.append(key, requestParams[key]);
        });

        if (this.config.debug) {
          console.log('GoogleSheetsSecureAPI: Making request to:', url.toString());
          console.log('GoogleSheetsSecureAPI: Request params:', params);
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
          if (this.config.debug) {
            console.log('GoogleSheetsSecureAPI: Request successful:', data);
          }
          return data;
        } else {
          throw new Error(data.message || 'Request failed');
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('GoogleSheetsSecureAPI: Request timeout');
          throw new Error('Request timeout');
        }
        console.error('GoogleSheetsSecureAPI: Request error:', error);
        throw error;
      }
    }

    /**
     * Make multiple requests in parallel
     */
    async requestAll(requestsArray) {
      return Promise.all(requestsArray.map(params => this.request(params)));
    }

    /**
     * Make multiple requests sequentially
     */
    async requestSequential(requestsArray) {
      const results = [];
      for (const params of requestsArray) {
        const result = await this.request(params);
        results.push(result);
      }
      return results;
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
      this.config.debug = true;
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
      this.config.debug = false;
    }
  }

  // Export to global scope
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS
    module.exports = GoogleSheetsSecureAPI;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function() {
      return GoogleSheetsSecureAPI;
    });
  } else {
    // Browser global
    global.GoogleSheetsSecureAPI = GoogleSheetsSecureAPI;
  }

})(typeof window !== 'undefined' ? window : this);
