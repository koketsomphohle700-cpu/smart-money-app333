/**
 * HTTPCanary Network Interceptor for betway.co.za
 * Captures and analyzes Aviator game API responses
 */

class HTTPCanaryInterceptor {
    constructor() {
        this.interceptedRequests = [];
        this.apiEndpoints = {
            aviator: [
                'betway.co.za/api/aviator',
                'betway.co.za/game/aviator',
                'api.betway.co.za/aviator',
                '/aviator/round',
                '/aviator/crash',
                '/game/status'
            ]
        };
        
        this.initializeInterceptor();
    }

    /**
     * Initialize HTTPCanary interceptor
     */
    initializeInterceptor() {
        console.log('[HTTPCanary] Initializing Network Interceptor');
        
        // Override fetch API
        this.interceptFetch();
        
        // Override XMLHttpRequest
        this.interceptXHR();
        
        // Monitor WebSocket connections
        this.interceptWebSocket();
    }

    /**
     * Intercept fetch requests
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = function(...args) {
            const [resource, config] = args;
            const requestUrl = typeof resource === 'string' ? resource : resource.url;
            
            const startTime = performance.now();
            
            return originalFetch.apply(this, args)
                .then(response => {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    self.captureRequest({
                        method: 'FETCH',
                        url: requestUrl,
                        status: response.status,
                        statusText: response.statusText,
                        duration: duration,
                        timestamp: new Date().toISOString(),
                        headers: self.extractHeaders(response.headers),
                        type: self.getRequestType(requestUrl)
                    }, response);
                    
                    return response;
                })
                .catch(error => {
                    console.error('[HTTPCanary] Fetch error:', error);
                    throw error;
                });
        };
    }

    /**
     * Intercept XMLHttpRequest
     */
    interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        const self = this;

        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._xhrStartTime = performance.now();
            this._xhrUrl = url;
            this._xhrMethod = method;
            return originalOpen.apply(this, [method, url, ...rest]);
        };

        XMLHttpRequest.prototype.send = function(data) {
            const self_ = this;
            const startTime = performance.now();

            const onLoadHandler = function() {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                let responseData = null;
                try {
                    responseData = JSON.parse(self_.responseText);
                } catch (e) {
                    responseData = self_.responseText;
                }

                self.captureRequest({
                    method: self_.method,
                    url: self_.url,
                    status: self_.status,
                    statusText: self_.statusText,
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    requestBody: data,
                    responseData: responseData,
                    type: self.getRequestType(self_.url)
                });
            };

            this.addEventListener('load', onLoadHandler);
            this.addEventListener('error', function() {
                console.error('[HTTPCanary] XHR Error:', this.status, this.statusText);
            });

            return originalSend.apply(this, [data]);
        };
    }

    /**
     * Intercept WebSocket connections
     */
    interceptWebSocket() {
        const originalWebSocket = window.WebSocket;
        const self = this;

        window.WebSocket = function(url, protocols) {
            console.log('[HTTPCanary] WebSocket connected:', url);

            const ws = new originalWebSocket(url, protocols);
            
            const originalSend = ws.send;
            ws.send = function(data) {
                self.captureWebSocketMessage({
                    direction: 'OUTBOUND',
                    url: url,
                    data: data,
                    timestamp: new Date().toISOString(),
                    type: self.getRequestType(url)
                });
                return originalSend.apply(this, [data]);
            };

            ws.addEventListener('message', (event) => {
                self.captureWebSocketMessage({
                    direction: 'INBOUND',
                    url: url,
                    data: event.data,
                    timestamp: new Date().toISOString(),
                    type: self.getRequestType(url)
                });
            });

            return ws;
        };

        // Preserve WebSocket prototype
        window.WebSocket.prototype = originalWebSocket.prototype;
    }

    /**
     * Capture request details
     */
    captureRequest(requestInfo, response = null) {
        const isAviatorRequest = this.isAviatorRelated(requestInfo.url);

        if (isAviatorRequest) {
            console.log('[HTTPCanary] 🎮 Aviator Request Captured:', requestInfo);

            const capturedData = {
                ...requestInfo,
                id: this.generateRequestId(),
                isAviator: true
            };

            this.interceptedRequests.push(capturedData);

            // Parse and analyze response
            if (response) {
                this.analyzeAviatorResponse(response, capturedData);
            }

            // Keep only recent requests
            if (this.interceptedRequests.length > 100) {
                this.interceptedRequests.shift();
            }

            // Emit event for subscribers
            this.emitInterceptEvent('aviator-request', capturedData);
        }
    }

    /**
     * Capture WebSocket messages
     */
    captureWebSocketMessage(messageInfo) {
        if (this.isAviatorRelated(messageInfo.url)) {
            console.log('[HTTPCanary] 📡 WebSocket Message:', messageInfo);

            let parsedData = null;
            try {
                parsedData = JSON.parse(messageInfo.data);
            } catch (e) {
                parsedData = messageInfo.data;
            }

            const capturedData = {
                ...messageInfo,
                id: this.generateRequestId(),
                parsedData: parsedData,
                isAviator: true
            };

            this.interceptedRequests.push(capturedData);

            // Analyze WebSocket data for game events
            this.analyzeWebSocketData(parsedData, capturedData);

            // Emit event
            this.emitInterceptEvent('aviator-websocket', capturedData);
        }
    }

    /**
     * Analyze Aviator API response
     */
    analyzeAviatorResponse(response, requestInfo) {
        response.clone().json()
            .then(data => {
                console.log('[HTTPCanary] 📊 Parsed Response:', data);

                // Check for round data
                if (data.roundId || data.roundNumber) {
                    this.emitInterceptEvent('round-info', {
                        roundId: data.roundId || data.roundNumber,
                        crashPoint: data.crashPoint || data.multiplier,
                        timestamp: requestInfo.timestamp
                    });
                }

                // Check for crash point data
                if (data.crashPoint || data.crashedAt) {
                    this.emitInterceptEvent('crash-point', {
                        crashPoint: data.crashPoint || data.crashedAt,
                        roundId: data.roundId,
                        timestamp: requestInfo.timestamp
                    });
                }

                // Check for game status
                if (data.status) {
                    this.emitInterceptEvent('game-status', {
                        status: data.status,
                        roundId: data.roundId,
                        timestamp: requestInfo.timestamp
                    });
                }
            })
            .catch(e => {
                // Response is not JSON
            });
    }

    /**
     * Analyze WebSocket game data
     */
    analyzeWebSocketData(data, messageInfo) {
        if (!data) return;

        // Check for round start
        if (data.type === 'round_start' || data.action === 'start') {
            this.emitInterceptEvent('round-started', {
                roundId: data.roundId,
                timestamp: messageInfo.timestamp
            });
        }

        // Check for crash
        if (data.type === 'crash' || data.action === 'crash' || data.crashPoint) {
            this.emitInterceptEvent('round-crashed', {
                crashPoint: data.crashPoint,
                roundId: data.roundId,
                timestamp: messageInfo.timestamp
            });
        }

        // Check for game status updates
        if (data.type === 'status_update' || data.status) {
            this.emitInterceptEvent('status-update', {
                status: data.status,
                data: data
            });
        }

        // Check for balance updates
        if (data.balance !== undefined) {
            this.emitInterceptEvent('balance-update', {
                balance: data.balance,
                timestamp: messageInfo.timestamp
            });
        }
    }

    /**
     * Check if URL is Aviator-related
     */
    isAviatorRelated(url) {
        if (!url) return false;

        const urlLower = url.toLowerCase();
        
        return this.apiEndpoints.aviator.some(endpoint => 
            urlLower.includes(endpoint.toLowerCase())
        ) || urlLower.includes('aviator') || urlLower.includes('betway');
    }

    /**
     * Extract headers from response
     */
    extractHeaders(headers) {
        const headerObj = {};
        headers.forEach((value, key) => {
            headerObj[key] = value;
        });
        return headerObj;
    }

    /**
     * Get request type
     */
    getRequestType(url) {
        if (!url) return 'unknown';
        
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('aviator')) return 'aviator';
        if (urlLower.includes('crash')) return 'crash-point';
        if (urlLower.includes('round')) return 'round-info';
        if (urlLower.includes('balance')) return 'balance';
        if (urlLower.includes('status')) return 'status';
        
        return 'general';
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Emit custom event
     */
    emitInterceptEvent(eventName, detail) {
        const event = new CustomEvent(`httpcanary:${eventName}`, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Subscribe to interceptor events
     */
    subscribe(eventName, callback) {
        document.addEventListener(`httpcanary:${eventName}`, (event) => {
            callback(event.detail);
        });
    }

    /**
     * Get all intercepted requests
     */
    getInterceptedRequests() {
        return this.interceptedRequests;
    }

    /**
     * Get aviator-specific requests
     */
    getAviatorRequests() {
        return this.interceptedRequests.filter(req => req.isAviator);
    }

    /**
     * Clear intercepted data
     */
    clearInterceptedData() {
        this.interceptedRequests = [];
    }

    /**
     * Export intercepted data
     */
    exportData(format = 'json') {
        const data = {
            exportDate: new Date().toISOString(),
            requestCount: this.interceptedRequests.length,
            aviatorRequests: this.getAviatorRequests(),
            allRequests: this.interceptedRequests
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }

        return data;
    }

    /**
     * Log interceptor stats
     */
    logStats() {
        const aviatorRequests = this.getAviatorRequests();
        console.log('[HTTPCanary] Statistics:');
        console.log(`  Total Requests: ${this.interceptedRequests.length}`);
        console.log(`  Aviator Requests: ${aviatorRequests.length}`);
        console.log(`  Request Types:`, aviatorRequests.reduce((acc, req) => {
            acc[req.type] = (acc[req.type] || 0) + 1;
            return acc;
        }, {}));
    }
}

/**
 * Integration with AviatorPredictor
 */
class AviatorPredictorHTTPCanaryBridge {
    constructor(predictor, interceptor) {
        this.predictor = predictor;
        this.interceptor = interceptor;
        this.setupBridge();
    }

    /**
     * Set up event bridge between interceptor and predictor
     */
    setupBridge() {
        console.log('[Bridge] Connecting HTTPCanary Interceptor to AviatorPredictor');

        // Listen for round info from HTTPCanary
        this.interceptor.subscribe('round-info', (data) => {
            console.log('[Bridge] Received round info:', data);
            if (this.predictor && this.predictor.currentRound !== data.roundId) {
                this.predictor.currentRound = data.roundId;
            }
        });

        // Listen for crash points
        this.interceptor.subscribe('crash-point', (data) => {
            console.log('[Bridge] Received crash point:', data.crashPoint);
            if (this.predictor) {
                this.predictor.addHistoricalMultiplier(data.crashPoint);
            }
        });

        // Listen for round started
        this.interceptor.subscribe('round-started', (data) => {
            console.log('[Bridge] Round started:', data.roundId);
            if (this.predictor) {
                this.predictor.onWheelSpinStart();
            }
        });

        // Listen for round crashed
        this.interceptor.subscribe('round-crashed', (data) => {
            console.log('[Bridge] Round crashed at:', data.crashPoint);
            if (this.predictor) {
                this.predictor.addHistoricalMultiplier(data.crashPoint);
                this.predictor.onWheelSpinEnd();
            }
        });

        // Listen for game status
        this.interceptor.subscribe('game-status', (data) => {
            console.log('[Bridge] Game status:', data.status);
            if (this.predictor) {
                this.predictor.updateGameStatus(data.status);
            }
        });
    }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.httpCanaryInterceptor = new HTTPCanaryInterceptor();
        
        // Connect to predictor if available
        if (window.aviatorPredictor) {
            window.predictorBridge = new AviatorPredictorHTTPCanaryBridge(
                window.aviatorPredictor,
                window.httpCanaryInterceptor
            );
        }
    });
} else {
    window.httpCanaryInterceptor = new HTTPCanaryInterceptor();
    
    if (window.aviatorPredictor) {
        window.predictorBridge = new AviatorPredictorHTTPCanaryBridge(
            window.aviatorPredictor,
            window.httpCanaryInterceptor
        );
    }
}

// Expose API
window.HTTPCanaryInterceptor = HTTPCanaryInterceptor;
window.AviatorPredictorHTTPCanaryBridge = AviatorPredictorHTTPCanaryBridge;
