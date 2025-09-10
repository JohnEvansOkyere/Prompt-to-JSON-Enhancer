// api.js
// API communication functions for the Prompt-to-JSON Enhancer

/**
 * API Configuration
 */
const API_CONFIG = {
    // Development URL - change this to your deployed backend URL
    BASE_URL: 'https://prompt-to-json-enhancer.onrender.com',
    
    // Timeout for API requests (in milliseconds)
    TIMEOUT: 60000,
    
    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

/**
 * HTTP request wrapper with error handling and retries
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Response>} Fetch response
 */
async function makeRequest(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle timeout
        if (error.name === 'AbortError') {
            throw new APIError('Request timeout. Please try again.', 408);
        }
        
        // Handle network errors with retry
        if (error.name === 'TypeError' && retryCount < API_CONFIG.MAX_RETRIES) {
            console.warn(`Network error, retrying... (${retryCount + 1}/${API_CONFIG.MAX_RETRIES})`);
            await delay(API_CONFIG.RETRY_DELAY * (retryCount + 1));
            return makeRequest(url, options, retryCount + 1);
        }
        
        throw error;
    }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status = 500, details = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

/**
 * Delay function for retry logic
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * API service object containing all API methods
 */
const API = {
    /**
     * Test API connection
     * @returns {Promise<boolean>} True if API is reachable
     */
    async testConnection() {
        try {
            const response = await makeRequest(`${API_CONFIG.BASE_URL}/health`);
            const data = await response.json();
            return data.status === 'healthy' || data.status === 'degraded';
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    },

    /**
     * Get API health status
     * @returns {Promise<Object>} Health status object
     */
    async getHealthStatus() {
        try {
            const response = await makeRequest(`${API_CONFIG.BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get health status:', error);
            throw new APIError('Failed to check API health status');
        }
    },

    /**
     * Enhance a prompt using the AI service
     * @param {Object} promptData - Prompt data object
     * @param {string} promptData.original_prompt - Original prompt text
     * @param {string} promptData.enhancement_type - Type of enhancement
     * @param {string} promptData.target_audience - Target audience
     * @param {boolean} promptData.include_examples - Whether to include examples
     * @returns {Promise<Object>} Enhanced prompt response
     */
    async enhancePrompt(promptData) {
        try {
            // Validate input data
            if (!promptData.original_prompt || typeof promptData.original_prompt !== 'string') {
                throw new APIError('Original prompt is required and must be a string');
            }

            const requestBody = {
                original_prompt: promptData.original_prompt.trim(),
                enhancement_type: promptData.enhancement_type || 'general',
                target_audience: promptData.target_audience || 'general',
                include_examples: promptData.include_examples !== false
            };

            console.log('Sending enhancement request:', requestBody);

            const response = await makeRequest(`${API_CONFIG.BASE_URL}/enhance-prompt`, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            
            // Validate response structure
            if (!result.enhanced_prompt || !result.prompt_structure) {
                throw new APIError('Invalid response format from server');
            }

            console.log('Enhancement response received:', result);
            return result;

        } catch (error) {
            console.error('Prompt enhancement failed:', error);
            
            if (error instanceof APIError) {
                throw error;
            }
            
            // Handle JSON parsing errors
            if (error.name === 'SyntaxError') {
                throw new APIError('Invalid response from server. Please try again.');
            }
            
            // Handle network errors
            if (error.name === 'TypeError') {
                throw new APIError('Network error. Please check your connection and try again.');
            }
            
            throw new APIError('Failed to enhance prompt. Please try again.');
        }
    },

    /**
     * Get available templates and options
     * @returns {Promise<Object>} Templates and options object
     */
    async getTemplates() {
        try {
            const response = await makeRequest(`${API_CONFIG.BASE_URL}/templates`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get templates:', error);
            
            // Return default templates if API fails
            return {
                enhancement_types: [
                    { id: 'general', name: 'General Enhancement', description: 'Balanced enhancement for any prompt type' },
                    { id: 'creative', name: 'Creative Writing', description: 'Optimized for creative and artistic prompts' },
                    { id: 'technical', name: 'Technical/Coding', description: 'Best for programming and technical prompts' },
                    { id: 'business', name: 'Business/Marketing', description: 'Tailored for business and marketing prompts' },
                    { id: 'educational', name: 'Educational', description: 'Perfect for learning and teaching prompts' }
                ],
                target_audiences: [
                    { id: 'general', name: 'General Audience' },
                    { id: 'beginner', name: 'Beginner' },
                    { id: 'intermediate', name: 'Intermediate' },
                    { id: 'expert', name: 'Expert/Professional' },
                    { id: 'student', name: 'Student' },
                    { id: 'business', name: 'Business Professional' }
                ]
            };
        }
    }
};

/**
 * API request queue for handling multiple concurrent requests
 */
class APIQueue {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.running = [];
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Add request to queue
     * @param {Function} requestFn - Function that returns a promise
     * @returns {Promise} Promise that resolves when request completes
     */
    add(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                requestFn,
                resolve,
                reject
            });
            this.process();
        });
    }

    /**
     * Process queued requests
     */
    async process() {
        if (this.running.length >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const { requestFn, resolve, reject } = this.queue.shift();
        const promise = requestFn()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.running = this.running.filter(p => p !== promise);
                this.process(); // Process next item in queue
            });

        this.running.push(promise);
        this.process(); // Try to process more items
    }

    /**
     * Get queue status
     * @returns {Object} Queue status object
     */
    getStatus() {
        return {
            queued: this.queue.length,
            running: this.running.length,
            total: this.queue.length + this.running.length
        };
    }
}

// Create global API queue instance
const apiQueue = new APIQueue(2); // Allow max 2 concurrent requests

/**
 * Queued API wrapper - automatically queues requests to prevent overload
 */
const QueuedAPI = {
    /**
     * Enhance prompt with queueing
     * @param {Object} promptData - Prompt data
     * @returns {Promise<Object>} Enhanced prompt response
     */
    enhancePrompt(promptData) {
        return apiQueue.add(() => API.enhancePrompt(promptData));
    },

    /**
     * Test connection with queueing
     * @returns {Promise<boolean>} Connection status
     */
    testConnection() {
        return apiQueue.add(() => API.testConnection());
    },

    /**
     * Get health status with queueing
     * @returns {Promise<Object>} Health status
     */
    getHealthStatus() {
        return apiQueue.add(() => API.getHealthStatus());
    },

    /**
     * Get templates with queueing
     * @returns {Promise<Object>} Templates object
     */
    getTemplates() {
        return apiQueue.add(() => API.getTemplates());
    },

    /**
     * Get queue status
     * @returns {Object} Queue status
     */
    getQueueStatus() {
        return apiQueue.getStatus();
    }
};

/**
 * API event emitter for handling API events
 */
class APIEventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to API events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Unsubscribe from API events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emit API event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }
}

// Create global API event emitter
const apiEvents = new APIEventEmitter();

/**
 * Enhanced API wrapper with events and caching
 */
const EnhancedAPI = {
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutes

    /**
     * Get cached data or fetch from API
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Function to fetch data
     * @param {number} timeout - Cache timeout override
     * @returns {Promise<*>} Cached or fetched data
     */
    async getCached(key, fetchFn, timeout = this.cacheTimeout) {
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < timeout) {
            return cached.data;
        }

        try {
            const data = await fetchFn();
            this.cache.set(key, { data, timestamp: now });
            return data;
        } catch (error) {
            // Return cached data if available, even if expired
            if (cached) {
                console.warn('API request failed, using cached data:', error);
                return cached.data;
            }
            throw error;
        }
    },

    /**
     * Clear cache
     * @param {string} key - Specific key to clear, or all if not provided
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    },

    /**
     * Enhanced prompt enhancement with events
     * @param {Object} promptData - Prompt data
     * @returns {Promise<Object>} Enhanced prompt response
     */
    async enhancePrompt(promptData) {
        try {
            apiEvents.emit('enhance:start', promptData);
            
            const result = await QueuedAPI.enhancePrompt(promptData);
            
            apiEvents.emit('enhance:success', { promptData, result });
            return result;
            
        } catch (error) {
            apiEvents.emit('enhance:error', { promptData, error });
            throw error;
        }
    },

    /**
     * Get templates with caching
     * @returns {Promise<Object>} Templates object
     */
    async getTemplates() {
        return this.getCached('templates', () => API.getTemplates(), 30 * 60 * 1000); // Cache for 30 minutes
    },

    /**
     * Get health status with caching
     * @returns {Promise<Object>} Health status
     */
    async getHealthStatus() {
        return this.getCached('health', () => API.getHealthStatus(), 60 * 1000); // Cache for 1 minute
    },

    /**
     * Test connection
     * @returns {Promise<boolean>} Connection status
     */
    testConnection() {
        return QueuedAPI.testConnection();
    },

    /**
     * Subscribe to API events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        apiEvents.on(event, callback);
    },

    /**
     * Unsubscribe from API events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        apiEvents.off(event, callback);
    }
};

/**
 * Offline detection and handling
 */
class OfflineHandler {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingRequests = [];

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processPendingRequests();
            apiEvents.emit('connection:online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            apiEvents.emit('connection:offline');
        });
    }

    /**
     * Add request to pending queue when offline
     * @param {Function} requestFn - Request function
     * @returns {Promise} Promise that resolves when back online
     */
    addPendingRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.pendingRequests.push({ requestFn, resolve, reject });
        });
    }

    /**
     * Process pending requests when back online
     */
    async processPendingRequests() {
        if (!this.isOnline || this.pendingRequests.length === 0) {
            return;
        }

        const requests = [...this.pendingRequests];
        this.pendingRequests = [];

        for (const { requestFn, resolve, reject } of requests) {
            try {
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }

    /**
     * Check if online
     * @returns {boolean} Online status
     */
    getOnlineStatus() {
        return this.isOnline;
    }
}

// Create global offline handler
const offlineHandler = new OfflineHandler();

/**
 * Export API modules for use in other scripts
 */
window.API = API;
window.QueuedAPI = QueuedAPI;
window.EnhancedAPI = EnhancedAPI;
window.APIError = APIError;
window.OfflineHandler = offlineHandler;

// Export configuration for easy modification
window.API_CONFIG = API_CONFIG;