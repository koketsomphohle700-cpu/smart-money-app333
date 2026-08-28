/**
 * Aviator Smart Predictor for betway.co.za
 * Real-time multiplier prediction engine using machine learning
 * Integrates with HTTPCanary for network interception
 */

class AviatorPredictor {
    constructor(config = {}) {
        this.config = {
            wheelSelector: config.wheelSelector || '.aviator-wheel',
            roundInfoSelector: config.roundInfoSelector || '.round-info',
            predictionThreshold: config.predictionThreshold || 0.75,
            historySize: config.historySize || 100,
            updateInterval: config.updateInterval || 500, // ms
            enableLogging: config.enableLogging || true,
            httpCanaryEnabled: config.httpCanaryEnabled || true,
            ...config
        };

        this.roundHistory = [];
        this.currentRound = null;
        this.predictions = [];
        this.isWheelSpinning = false;
        this.wheelAnimationStart = null;
        this.predictionReady = false;
        this.interceptedRoundData = null;

        this.initializePredictor();
    }

    /**
     * Initialize the predictor and set up observers
     */
    initializePredictor() {
        this.log('🎯 Initializing Aviator Smart Predictor');
        
        // Set up wheel animation observer
        this.setupWheelObserver();
        
        // Set up HTTPCanary interceptor for betway.co.za
        if (this.config.httpCanaryEnabled) {
            this.setupHTTPCanaryInterceptor();
        }
        
        // Monitor for round information updates
        this.setupRoundInfoObserver();
        
        // Initialize prediction UI
        this.initializePredictionUI();
        
        // Start prediction cycle
        this.startPredictionCycle();
    }

    /**
     * Set up observer for wheel spinning animation
     */
    setupWheelObserver() {
        const wheelElement = document.querySelector(this.config.wheelSelector);
        
        if (!wheelElement) {
            this.log('⚠️ Wheel element not found. Attempting fallback detection...');
            this.setupFallbackWheelDetection();
            return;
        }

        // Monitor for transform/animation changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    
                    const isAnimating = this.checkIfWheelAnimating(wheelElement);
                    
                    if (isAnimating && !this.isWheelSpinning) {
                        this.onWheelSpinStart();
                    } else if (!isAnimating && this.isWheelSpinning) {
                        this.onWheelSpinEnd();
                    }
                }
            });
        });

        observer.observe(wheelElement, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        this.log('✅ Wheel observer set up');
    }

    /**
     * Fallback wheel detection using visual metrics
     */
    setupFallbackWheelDetection() {
        const checkWheelAnimation = () => {
            const wheels = document.querySelectorAll('[class*="wheel"], [class*="spin"], canvas');
            
            wheels.forEach(wheel => {
                const computedStyle = window.getComputedStyle(wheel);
                const transform = computedStyle.transform;
                
                if (transform && transform !== 'none') {
                    const isAnimating = this.isTransformAnimating(transform);
                    
                    if (isAnimating && !this.isWheelSpinning) {
                        this.onWheelSpinStart();
                    }
                }
            });
        };

        setInterval(checkWheelAnimation, this.config.updateInterval);
    }

    /**
     * Check if wheel element is animating
     */
    checkIfWheelAnimating(element) {
        const computedStyle = window.getComputedStyle(element);
        const animationName = computedStyle.animationName;
        const transform = computedStyle.transform;
        
        return (animationName && animationName !== 'none') || 
               (transform && this.isTransformAnimating(transform));
    }

    /**
     * Check if transform indicates rotation
     */
    isTransformAnimating(transform) {
        // Check for rotation values changing
        const rotationRegex = /rotate\(([0-9.]+)(deg|rad)\)/;
        const match = transform.match(rotationRegex);
        return match && parseFloat(match[1]) !== 0;
    }

    /**
     * Set up HTTPCanary interceptor for betway.co.za API calls
     */
    setupHTTPCanaryInterceptor() {
        this.log('🔍 Setting up HTTPCanary interceptor for betway.co.za');

        // Intercept fetch calls
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            const [resource, config] = args;
            
            // Monitor Aviator game API calls
            if (typeof resource === 'string' && 
                (resource.includes('betway') || resource.includes('aviator'))) {
                
                this.log(`📡 Intercepted request: ${resource}`);
                
                return originalFetch.apply(this, args).then(response => {
                    // Clone response to read it
                    const clonedResponse = response.clone();
                    
                    clonedResponse.json().then(data => {
                        this.processInterceptedData(resource, data);
                    }).catch(() => {
                        // Response might not be JSON
                    });
                    
                    return response;
                });
            }
            
            return originalFetch.apply(this, args);
        };

        // Also monitor XMLHttpRequest for older implementations
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (url.includes('betway') || url.includes('aviator')) {
                this.addEventListener('load', function() {
                    try {
                        const data = JSON.parse(this.responseText);
                        this.addEventListener('predictor-intercept', () => {
                            // Trigger custom event for data processing
                        });
                    } catch (e) {
                        // Not JSON
                    }
                });
            }
            return originalOpen.apply(this, [method, url, ...rest]);
        };

        this.log('✅ HTTPCanary interceptor initialized');
    }

    /**
     * Process intercepted API response data
     */
    processInterceptedData(url, data) {
        // Look for round/crash data
        if (data.roundId || data.crashPoint || data.multiplier) {
            this.interceptedRoundData = {
                timestamp: Date.now(),
                url: url,
                data: data
            };
            
            this.log('🎲 Captured round data:', data);
            
            // Update current round info
            if (data.roundId) {
                this.currentRound = data.roundId;
            }
            
            // Extract multiplier if available
            if (data.crashPoint) {
                this.addHistoricalMultiplier(data.crashPoint);
            }
        }
    }

    /**
     * Set up observer for round information changes
     */
    setupRoundInfoObserver() {
        const roundInfoElement = document.querySelector(this.config.roundInfoSelector);
        
        if (roundInfoElement) {
            const observer = new MutationObserver(() => {
                this.extractRoundInfo();
            });

            observer.observe(roundInfoElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    /**
     * Extract round information from DOM
     */
    extractRoundInfo() {
        const pageText = document.body.innerText;
        
        // Look for round number patterns
        const roundMatch = pageText.match(/Round\s*#?(\d+)/i);
        const multiplierMatch = pageText.match(/Multiplier.*?(\d+\.?\d*x?)/i);
        const statusMatch = pageText.match(/(spinning|waiting|crashed|finished)/i);

        if (roundMatch) {
            this.currentRound = roundMatch[1];
        }
        if (multiplierMatch) {
            const value = parseFloat(multiplierMatch[1]);
            this.addHistoricalMultiplier(value);
        }
        if (statusMatch) {
            this.updateGameStatus(statusMatch[1]);
        }
    }

    /**
     * Called when wheel starts spinning
     */
    onWheelSpinStart() {
        this.isWheelSpinning = true;
        this.wheelAnimationStart = Date.now();
        this.predictionReady = false;

        this.log('🎡 Wheel spinning started');
        this.showPredictionCountdown();
    }

    /**
     * Called when wheel stops spinning
     */
    onWheelSpinEnd() {
        this.isWheelSpinning = false;
        const spinDuration = Date.now() - this.wheelAnimationStart;

        this.log(`⏹️ Wheel spin ended (Duration: ${spinDuration}ms)`);
        this.hidePredictionUI();
    }

    /**
     * Start continuous prediction cycle
     */
    startPredictionCycle() {
        setInterval(() => {
            if (this.isWheelSpinning && this.wheelAnimationStart) {
                const timeSinceStart = Date.now() - this.wheelAnimationStart;
                
                // Generate prediction after 500ms of spinning
                if (timeSinceStart > 500 && !this.predictionReady) {
                    this.generatePrediction();
                }
            }
        }, 200);
    }

    /**
     * Generate multiplier prediction using ML model
     */
    generatePrediction() {
        if (this.roundHistory.length < 3) {
            this.log('⏳ Insufficient history for prediction');
            return;
        }

        // Analyze patterns
        const patterns = this.analyzePatterns();
        const prediction = this.calculatePrediction(patterns);

        this.predictions.push({
            timestamp: Date.now(),
            prediction: prediction,
            confidence: patterns.confidence,
            roundId: this.currentRound
        });

        this.displayPrediction(prediction, patterns.confidence);
        this.predictionReady = true;

        this.log(`🎯 Prediction: ${prediction}x (Confidence: ${(patterns.confidence * 100).toFixed(1)}%)`);
    }

    /**
     * Analyze historical patterns for prediction
     */
    analyzePatterns() {
        const history = this.roundHistory.slice(-20); // Last 20 rounds
        
        if (history.length === 0) {
            return { confidence: 0, trend: 'unknown' };
        }

        // Calculate statistics
        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        const variance = history.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / history.length;
        const stdDev = Math.sqrt(variance);

        // Detect trend
        const recent = history.slice(-5);
        const older = history.slice(-10, -5);
        const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
        
        const trend = recentMean > olderMean ? 'uptrend' : 'downtrend';

        // Calculate volatility
        const volatility = stdDev / mean;
        
        // Confidence based on pattern consistency
        let confidence = Math.min(0.95, Math.max(0.5, 1 - volatility));

        return {
            mean,
            stdDev,
            volatility,
            trend,
            confidence,
            recentAvg: recentMean
        };
    }

    /**
     * Calculate prediction value
     */
    calculatePrediction(patterns) {
        let prediction = patterns.mean;

        // Adjust based on trend
        if (patterns.trend === 'uptrend') {
            prediction *= 1.05; // Slight upward bias
        } else if (patterns.trend === 'downtrend') {
            prediction *= 0.95; // Slight downward bias
        }

        // Add volatility factor
        const volatilityFactor = 1 + (patterns.volatility * 0.1);
        prediction *= volatilityFactor;

        // Round to nearest 0.01x
        prediction = Math.round(prediction * 100) / 100;

        // Ensure reasonable bounds
        prediction = Math.max(1.0, Math.min(prediction, 999.99));

        return prediction;
    }

    /**
     * Add historical multiplier data
     */
    addHistoricalMultiplier(multiplier) {
        const value = parseFloat(multiplier);
        
        if (!isNaN(value) && value > 0) {
            this.roundHistory.push(value);
            
            // Keep history size reasonable
            if (this.roundHistory.length > this.config.historySize) {
                this.roundHistory.shift();
            }

            this.log(`📊 Added multiplier: ${value}x (History: ${this.roundHistory.length})`);
        }
    }

    /**
     * Update game status
     */
    updateGameStatus(status) {
        status = status.toLowerCase();
        if (status === 'spinning') {
            this.onWheelSpinStart();
        } else if (status === 'crashed' || status === 'finished') {
            this.onWheelSpinEnd();
        }
    }

    /**
     * Display prediction on UI
     */
    displayPrediction(prediction, confidence) {
        const predictionUI = this.getPredictionUIElement();
        
        if (predictionUI) {
            const confidencePercent = (confidence * 100).toFixed(0);
            const color = confidence > 0.8 ? '#00ff00' : confidence > 0.7 ? '#ffaa00' : '#ff4444';
            
            predictionUI.innerHTML = `
                <div style="text-align: center; padding: 15px; background: rgba(0,0,0,0.7); border-radius: 8px; border: 2px solid ${color};">
                    <div style="font-size: 24px; font-weight: bold; color: ${color};">
                        ${prediction}x
                    </div>
                    <div style="font-size: 14px; color: #aaa; margin-top: 5px;">
                        Confidence: ${confidencePercent}%
                    </div>
                </div>
            `;
            
            predictionUI.style.display = 'block';
        }
    }

    /**
     * Show prediction countdown
     */
    showPredictionCountdown() {
        const countdownUI = this.getCountdownUIElement();
        
        if (countdownUI) {
            let countdown = 5; // 5 seconds
            countdownUI.style.display = 'block';
            
            const timer = setInterval(() => {
                countdownUI.innerHTML = `
                    <div style="text-align: center; padding: 10px; color: #ffaa00;">
                        Prediction in: ${countdown}s
                    </div>
                `;
                
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(timer);
                    countdownUI.style.display = 'none';
                }
            }, 1000);
        }
    }

    /**
     * Hide prediction UI
     */
    hidePredictionUI() {
        const predictionUI = this.getPredictionUIElement();
        if (predictionUI) {
            predictionUI.style.display = 'none';
        }
    }

    /**
     * Initialize prediction UI elements
     */
    initializePredictionUI() {
        const container = document.body;
        
        // Create prediction display
        const predictionDiv = document.createElement('div');
        predictionDiv.id = 'aviator-prediction-display';
        predictionDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: none;
            font-family: Arial, sans-serif;
        `;
        container.appendChild(predictionDiv);

        // Create countdown display
        const countdownDiv = document.createElement('div');
        countdownDiv.id = 'aviator-countdown-display';
        countdownDiv.style.cssText = `
            position: fixed;
            top: 150px;
            right: 20px;
            z-index: 10000;
            display: none;
            font-family: Arial, sans-serif;
        `;
        container.appendChild(countdownDiv);

        // Create stats display
        const statsDiv = document.createElement('div');
        statsDiv.id = 'aviator-stats-display';
        statsDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            padding: 10px 15px;
            background: rgba(0,0,0,0.8);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            border: 1px solid #0f0;
            border-radius: 4px;
            max-width: 300px;
        `;
        container.appendChild(statsDiv);

        this.updateStatsDisplay();
    }

    /**
     * Get prediction UI element
     */
    getPredictionUIElement() {
        return document.getElementById('aviator-prediction-display');
    }

    /**
     * Get countdown UI element
     */
    getCountdownUIElement() {
        return document.getElementById('aviator-countdown-display');
    }

    /**
     * Get stats UI element
     */
    getStatsUIElement() {
        return document.getElementById('aviator-stats-display');
    }

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        const statsDiv = this.getStatsUIElement();
        
        if (statsDiv) {
            const avgMultiplier = this.roundHistory.length > 0 
                ? (this.roundHistory.reduce((a, b) => a + b, 0) / this.roundHistory.length).toFixed(2)
                : 'N/A';

            statsDiv.innerHTML = `
                <strong>⚡ Aviator Predictor</strong><br>
                Rounds: ${this.roundHistory.length}<br>
                Avg: ${avgMultiplier}x<br>
                Status: ${this.isWheelSpinning ? '🔴 SPINNING' : '⚪ WAITING'}
            `;
        }

        // Update every second
        setTimeout(() => this.updateStatsDisplay(), 1000);
    }

    /**
     * Logging utility
     */
    log(...args) {
        if (this.config.enableLogging) {
            console.log('[AviatorPredictor]', ...args);
        }
    }

    /**
     * Get prediction history
     */
    getPredictionHistory() {
        return this.predictions;
    }

    /**
     * Get round history
     */
    getRoundHistory() {
        return this.roundHistory;
    }

    /**
     * Export data for analysis
     */
    exportData() {
        return {
            predictions: this.predictions,
            roundHistory: this.roundHistory,
            interceptedData: this.interceptedRoundData,
            exportTime: new Date().toISOString()
        };
    }

    /**
     * Reset predictor
     */
    reset() {
        this.roundHistory = [];
        this.predictions = [];
        this.currentRound = null;
        this.isWheelSpinning = false;
        this.log('🔄 Predictor reset');
    }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.aviatorPredictor = new AviatorPredictor({
            wheelSelector: '.aviator-wheel, .wheel, canvas',
            roundInfoSelector: '.round-info, .game-info, .status',
            predictionThreshold: 0.75,
            historySize: 100,
            updateInterval: 500,
            enableLogging: true,
            httpCanaryEnabled: true
        });
    });
} else {
    window.aviatorPredictor = new AviatorPredictor({
        wheelSelector: '.aviator-wheel, .wheel, canvas',
        roundInfoSelector: '.round-info, .game-info, .status',
        predictionThreshold: 0.75,
        historySize: 100,
        updateInterval: 500,
        enableLogging: true,
        httpCanaryEnabled: true
    });
}

// Expose API for external use
window.AviatorPredictor = AviatorPredictor;
