# Aviator Smart Guesser - API Reference

## Table of Contents

1. [AviatorPredictor Class](#aviatorpredictor-class)
2. [HTTPCanaryInterceptor Class](#httpcanaryinterceptor-class)
3. [AviatorPredictorHTTPCanaryBridge Class](#aviatorpredictorhttpcanarybridge-class)
4. [Events](#events)
5. [Code Examples](#code-examples)

---

## AviatorPredictor Class

Core prediction engine with machine learning capabilities.

### Constructor

```javascript
const predictor = new AviatorPredictor(config);
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `wheelSelector` | String | `.aviator-wheel` | CSS selector for wheel element |
| `roundInfoSelector` | String | `.round-info` | CSS selector for round info |
| `predictionThreshold` | Number | 0.75 | Minimum confidence for valid prediction |
| `historySize` | Number | 100 | Max rounds to keep in history |
| `updateInterval` | Number | 500 | Update frequency in milliseconds |
| `enableLogging` | Boolean | true | Enable console logging |
| `httpCanaryEnabled` | Boolean | true | Enable network interception |

### Properties

```javascript
// Active predictor instance
predictor.isWheelSpinning          // Boolean: Is wheel currently spinning
predictor.currentRound             // String: Current round ID
predictor.roundHistory             // Array: Historical multiplier data
predictor.predictions              // Array: Generated predictions
predictor.predictionReady          // Boolean: Prediction ready to display
predictor.wheelAnimationStart      // Number: Timestamp when spinning started
```

### Methods

#### prediction Generation

```javascript
// Trigger prediction (called automatically)
predictor.generatePrediction();
// Returns: undefined (updates UI internally)

// Calculate prediction from patterns
predictor.calculatePrediction(patterns);
// Returns: Number (predicted multiplier value)

// Analyze historical patterns
predictor.analyzePatterns();
// Returns: Object { mean, stdDev, volatility, trend, confidence, recentAvg }
```

#### Round Data Management

```javascript
// Add multiplier to history
predictor.addHistoricalMultiplier(multiplier);
// Parameters: multiplier (Number) - The multiplier value
// Returns: undefined

// Get round history
predictor.getRoundHistory();
// Returns: Array<Number> - All stored multipliers

// Get prediction history
predictor.getPredictionHistory();
// Returns: Array<Object> - All predictions with metadata
```

#### Wheel Events

```javascript
// Called when wheel starts spinning
predictor.onWheelSpinStart();
// Returns: undefined

// Called when wheel stops spinning
predictor.onWheelSpinEnd();
// Returns: undefined

// Update game status
predictor.updateGameStatus(status);
// Parameters: status (String) - 'spinning', 'crashed', 'finished', 'waiting'
// Returns: undefined
```

#### UI Management

```javascript
// Display prediction on UI
predictor.displayPrediction(prediction, confidence);
// Parameters: 
//   - prediction (Number) - Predicted multiplier
//   - confidence (Number) - Confidence level 0-1
// Returns: undefined

// Show countdown before prediction
predictor.showPredictionCountdown();
// Returns: undefined

// Hide prediction UI
predictor.hidePredictionUI();
// Returns: undefined

// Get prediction UI element
predictor.getPredictionUIElement();
// Returns: HTMLElement or null

// Get countdown UI element
predictor.getCountdownUIElement();
// Returns: HTMLElement or null

// Get stats UI element
predictor.getStatsUIElement();
// Returns: HTMLElement or null

// Update stats display
predictor.updateStatsDisplay();
// Returns: undefined
```

#### Data Export & Management

```javascript
// Export all data
predictor.exportData();
// Returns: Object { predictions, roundHistory, exportTime }

// Reset predictor state
predictor.reset();
// Returns: undefined

// Get logs
predictor.log(...args);
// Parameters: ...args (any) - Values to log
// Returns: undefined (logs to console if enabled)
```

#### Configuration

```javascript
// Check wheel is animating
predictor.checkIfWheelAnimating(element);
// Returns: Boolean

// Check if transform indicates rotation
predictor.isTransformAnimating(transform);
// Returns: Boolean

// Extract round info from DOM
predictor.extractRoundInfo();
// Returns: undefined (updates internal state)
```

---

## HTTPCanaryInterceptor Class

Network interception engine for capturing Aviator API traffic.

### Constructor

```javascript
const interceptor = new HTTPCanaryInterceptor();
```

No parameters required - auto-initializes on creation.

### Properties

```javascript
interceptor.interceptedRequests    // Array: All captured requests
interceptor.apiEndpoints          // Object: Monitored API endpoints
```

### Methods

#### Request Capture

```javascript
// Capture request details
interceptor.captureRequest(requestInfo, response);
// Parameters:
//   - requestInfo (Object) - Request metadata
//   - response (Response) - Fetch Response object (optional)
// Returns: undefined

// Capture WebSocket message
interceptor.captureWebSocketMessage(messageInfo);
// Parameters: messageInfo (Object) - Message details
// Returns: undefined
```

#### Request Retrieval

```javascript
// Get all intercepted requests
interceptor.getInterceptedRequests();
// Returns: Array<Object> - All captured requests

// Get only Aviator-related requests
interceptor.getAviatorRequests();
// Returns: Array<Object> - Filtered Aviator requests

// Get request type
interceptor.getRequestType(url);
// Parameters: url (String) - Request URL
// Returns: String - 'aviator', 'crash-point', 'round-info', etc.
```

#### Analysis

```javascript
// Analyze Aviator API response
interceptor.analyzeAviatorResponse(response, requestInfo);
// Parameters:
//   - response (Response) - Fetch Response object
//   - requestInfo (Object) - Request metadata
// Returns: undefined (emits events)

// Analyze WebSocket game data
interceptor.analyzeWebSocketData(data, messageInfo);
// Parameters:
//   - data (Object) - Parsed WebSocket message
//   - messageInfo (Object) - Message metadata
// Returns: undefined (emits events)

// Check if URL is Aviator-related
interceptor.isAviatorRelated(url);
// Parameters: url (String) - URL to check
// Returns: Boolean
```

#### Event Management

```javascript
// Subscribe to interceptor events
interceptor.subscribe(eventName, callback);
// Parameters:
//   - eventName (String) - Event name without 'httpcanary:' prefix
//   - callback (Function) - Called with event detail
// Returns: undefined

// Emit custom event
interceptor.emitInterceptEvent(eventName, detail);
// Parameters:
//   - eventName (String) - Event name
//   - detail (Object) - Event data
// Returns: undefined
```

#### Data Management

```javascript
// Export intercepted data
interceptor.exportData(format);
// Parameters: format (String) - 'json' or 'object' (default: 'json')
// Returns: String or Object - Exported data

// Clear all intercepted data
interceptor.clearInterceptedData();
// Returns: undefined

// Log statistics
interceptor.logStats();
// Returns: undefined (logs to console)
```

#### Utility Methods

```javascript
// Extract headers from response
interceptor.extractHeaders(headers);
// Parameters: headers (Headers) - Response headers
// Returns: Object - Header key-value pairs

// Generate unique request ID
interceptor.generateRequestId();
// Returns: String - Unique ID in format 'req_timestamp_random'
```

---

## AviatorPredictorHTTPCanaryBridge Class

Bridge connecting predictor and interceptor for seamless data flow.

### Constructor

```javascript
const bridge = new AviatorPredictorHTTPCanaryBridge(predictor, interceptor);
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `predictor` | AviatorPredictor | Predictor instance |
| `interceptor` | HTTPCanaryInterceptor | Interceptor instance |

### Methods

```javascript
// Set up event bridge
bridge.setupBridge();
// Returns: undefined (called automatically in constructor)
```

### Event Connections

The bridge automatically connects these events:

| Interceptor Event | Predictor Action |
|-------------------|------------------|
| `round-info` | Updates `currentRound` |
| `crash-point` | Adds to history |
| `round-started` | Calls `onWheelSpinStart()` |
| `round-crashed` | Adds to history + calls `onWheelSpinEnd()` |
| `game-status` | Calls `updateGameStatus()` |

---

## Events

### HTTPCanary Events

All events are emitted as custom DOM events with prefix `httpcanary:`.

```javascript
// Listen to events
document.addEventListener('httpcanary:eventName', (event) => {
    const data = event.detail;
});
```

#### Aviator Prediction Events

```javascript
// Aviator request captured
document.addEventListener('httpcanary:aviator-request', (event) => {
    event.detail = {
        method: 'FETCH',
        url: String,
        status: Number,
        duration: Number,
        timestamp: String,
        type: String
    }
});

// Round information received
document.addEventListener('httpcanary:round-info', (event) => {
    event.detail = {
        roundId: String,
        crashPoint: Number,
        timestamp: String
    }
});

// Crash point received
document.addEventListener('httpcanary:crash-point', (event) => {
    event.detail = {
        crashPoint: Number,
        roundId: String,
        timestamp: String
    }
});

// Game status updated
document.addEventListener('httpcanary:game-status', (event) => {
    event.detail = {
        status: String,
        roundId: String,
        timestamp: String
    }
});

// Round started
document.addEventListener('httpcanary:round-started', (event) => {
    event.detail = {
        roundId: String,
        timestamp: String
    }
});

// Round crashed
document.addEventListener('httpcanary:round-crashed', (event) => {
    event.detail = {
        crashPoint: Number,
        roundId: String,
        timestamp: String
    }
});

// WebSocket message captured
document.addEventListener('httpcanary:aviator-websocket', (event) => {
    event.detail = {
        direction: 'INBOUND' | 'OUTBOUND',
        url: String,
        data: String,
        parsedData: Object,
        timestamp: String
    }
});

// Balance update
document.addEventListener('httpcanary:balance-update', (event) => {
    event.detail = {
        balance: Number,
        timestamp: String
    }
});

// Status update
document.addEventListener('httpcanary:status-update', (event) => {
    event.detail = {
        status: String,
        data: Object
    }
});
```

---

## Code Examples

### Example 1: Basic Predictor Setup

```javascript
// Initialize predictor
const predictor = new AviatorPredictor({
    enableLogging: true,
    historySize: 50
});

// Monitor predictions
setInterval(() => {
    const history = predictor.getRoundHistory();
    const predictions = predictor.getPredictionHistory();
    
    console.log(`Rounds: ${history.length}, Predictions: ${predictions.length}`);
}, 1000);
```

### Example 2: Network Monitoring

```javascript
// Initialize interceptor
const interceptor = new HTTPCanaryInterceptor();

// Listen for crash points
interceptor.subscribe('crash-point', (data) => {
    console.log(`Crash at: ${data.crashPoint}x`);
});

// Listen for round info
interceptor.subscribe('round-info', (data) => {
    console.log(`Round ${data.roundId} started`);
});

// Export data periodically
setInterval(() => {
    const data = interceptor.exportData('json');
    console.log(data);
}, 30000); // Every 30 seconds
```

### Example 3: Prediction Analysis

```javascript
// Analyze predictions
function analyzePredictions() {
    const predictions = predictor.getPredictionHistory();
    const history = predictor.getRoundHistory();
    
    let correct = 0;
    let totalError = 0;
    
    predictions.forEach((pred, index) => {
        if (history[index]) {
            const actual = history[index];
            const predicted = pred.prediction;
            const error = Math.abs(predicted - actual) / actual;
            
            if (error < 0.05) correct++; // Within 5%
            totalError += error;
        }
    });
    
    const accuracy = (correct / predictions.length * 100).toFixed(2);
    const avgError = (totalError / predictions.length * 100).toFixed(2);
    
    console.log(`Accuracy: ${accuracy}%, Avg Error: ${avgError}%`);
}

// Run analysis
setInterval(analyzePredictions, 5000);
```

### Example 4: Event-Driven Automation

```javascript
// Automatic data export on crash
document.addEventListener('httpcanary:crash-point', (event) => {
    const data = predictor.exportData();
    
    // Send to server
    fetch('/api/aviator/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
});

// Alert on high confidence predictions
document.addEventListener('httpcanary:round-started', () => {
    setTimeout(() => {
        const latest = predictor.predictions[predictor.predictions.length - 1];
        
        if (latest && latest.confidence > 0.9) {
            console.log(`🎯 High confidence prediction: ${latest.prediction}x`);
            // Play sound, show notification, etc.
        }
    }, 500);
});
```

### Example 5: Custom Configuration

```javascript
// Create custom predictor with specific settings
const customPredictor = new AviatorPredictor({
    wheelSelector: '.game-wheel-container canvas',
    roundInfoSelector: '[data-round-info]',
    predictionThreshold: 0.8,
    historySize: 200,
    updateInterval: 250,
    enableLogging: false
});

// Bridge with interceptor
const interceptor = new HTTPCanaryInterceptor();
const bridge = new AviatorPredictorHTTPCanaryBridge(customPredictor, interceptor);

// Monitor performance
const stats = {
    totalPredictions: 0,
    accurateWithin5Percent: 0
};

document.addEventListener('httpcanary:crash-point', (event) => {
    const latest = customPredictor.predictions[customPredictor.predictions.length - 1];
    
    if (latest) {
        stats.totalPredictions++;
        const error = Math.abs(latest.prediction - event.detail.crashPoint) / event.detail.crashPoint;
        
        if (error < 0.05) {
            stats.accurateWithin5Percent++;
        }
    }
    
    console.log(`Accuracy Rate: ${(stats.accurateWithin5Percent / stats.totalPredictions * 100).toFixed(1)}%`);
});
```

### Example 6: Data Persistence

```javascript
// Save predictions to localStorage
function savePredictions() {
    const data = predictor.exportData();
    localStorage.setItem('aviator-predictions', JSON.stringify(data));
}

// Load previous predictions
function loadPredictions() {
    const saved = localStorage.getItem('aviator-predictions');
    if (saved) {
        const data = JSON.parse(saved);
        console.log('Loaded previous predictions:', data);
    }
}

// Auto-save every 10 seconds
setInterval(savePredictions, 10000);

// Load on startup
loadPredictions();
```

### Example 7: WebSocket Event Handling

```javascript
// Handle real-time WebSocket events
interceptor.subscribe('aviator-websocket', (data) => {
    if (data.direction === 'INBOUND') {
        const parsed = data.parsedData;
        
        // Handle different message types
        switch (parsed.type) {
            case 'round_start':
                console.log('Round started!');
                predictor.onWheelSpinStart();
                break;
                
            case 'crash':
                console.log(`Round crashed at ${parsed.crashPoint}x`);
                predictor.addHistoricalMultiplier(parsed.crashPoint);
                predictor.onWheelSpinEnd();
                break;
                
            case 'status_update':
                console.log('Status:', parsed.status);
                predictor.updateGameStatus(parsed.status);
                break;
        }
    }
});
```

---

## Error Handling

```javascript
try {
    // Initialize predictor
    const predictor = new AviatorPredictor();
    
    // Check if wheel element exists
    if (!document.querySelector('.aviator-wheel')) {
        throw new Error('Wheel element not found');
    }
    
    // Monitor for errors
    predictor.log('Predictor initialized successfully');
    
} catch (error) {
    console.error('Initialization error:', error);
    // Fallback initialization
    console.warn('Attempting fallback detection...');
}
```

---

**API Version**: 1.0.0
**Last Updated**: August 28, 2026
