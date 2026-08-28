/**
 * Aviator Trading Bot - Automated Trading Integration
 * Executes trades based on predictions with risk management
 */

class AviatorTradingBot {
    constructor(predictor, config = {}) {
        this.predictor = predictor;
        this.config = {
            enabled: config.enabled !== false,
            tradeOnConfidence: config.tradeOnConfidence || 0.75,
            minBetAmount: config.minBetAmount || 10,
            maxBetAmount: config.maxBetAmount || 1000,
            riskPercentage: config.riskPercent || 2, // % of balance
            profitTarget: config.profitTarget || 1.5, // 1.5x multiplier
            stopLoss: config.stopLoss || 0.5, // Cash out at 0.5x
            maxConsecutiveLosses: config.maxConsecutiveLosses || 5,
            autoReinvest: config.autoReinvest !== false,
            enableHedging: config.enableHedging || false,
            logTrades: config.logTrades !== false,
            ...config
        };

        this.tradeHistory = [];
        this.balance = 0;
        this.consecutiveLosses = 0;
        this.isTrading = false;
        this.currentTrade = null;
        this.totalProfit = 0;
        this.winRate = 0;

        this.initializeBot();
    }

    /**
     * Initialize trading bot
     */
    initializeBot() {
        this.log('🤖 Initializing Aviator Trading Bot');

        // Listen for predictions
        if (this.predictor) {
            this.setupPredictionListener();
        }

        // Periodically check for trading opportunities
        setInterval(() => {
            this.checkTradingOpportunity();
        }, 500);

        this.log('✅ Trading bot initialized');
    }

    /**
     * Set up prediction listener
     */
    setupPredictionListener() {
        // Monitor for new predictions
        const checkPredictions = setInterval(() => {
            if (this.predictor.predictions.length > 0) {
                const latest = this.predictor.predictions[this.predictor.predictions.length - 1];
                
                if (latest && latest.confidence >= this.config.tradeOnConfidence) {
                    this.evaluateTrade(latest);
                }
            }
        }, 250);
    }

    /**
     * Check for trading opportunity
     */
    checkTradingOpportunity() {
        if (!this.config.enabled || !this.predictor.isWheelSpinning) {
            return;
        }

        // Check if we have a valid prediction
        if (this.predictor.predictions.length === 0) {
            return;
        }

        const latest = this.predictor.predictions[this.predictor.predictions.length - 1];
        
        if (latest.confidence < this.config.tradeOnConfidence) {
            this.log(`⚠️ Low confidence: ${(latest.confidence * 100).toFixed(1)}%`);
            return;
        }

        // Check consecutive losses
        if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
            this.log(`🛑 Max consecutive losses reached: ${this.consecutiveLosses}`);
            return;
        }

        // Execute trade
        this.executeTrade(latest);
    }

    /**
     * Evaluate trade opportunity
     */
    evaluateTrade(prediction) {
        const tradeSignal = {
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            timestamp: Date.now(),
            roundId: prediction.roundId
        };

        // Calculate bet amount based on risk management
        const betAmount = this.calculateBetAmount();

        if (betAmount < this.config.minBetAmount) {
            this.log(`💔 Insufficient balance for minimum bet: $${this.config.minBetAmount}`);
            return;
        }

        tradeSignal.betAmount = betAmount;
        tradeSignal.expectedReturn = betAmount * prediction.prediction;
        tradeSignal.profitTarget = betAmount * this.config.profitTarget;
        tradeSignal.stopLoss = betAmount * this.config.stopLoss;

        return tradeSignal;
    }

    /**
     * Execute trade
     */
    executeTrade(prediction) {
        if (this.isTrading) {
            this.log('⏳ Trade already in progress');
            return;
        }

        const tradeSignal = this.evaluateTrade(prediction);
        if (!tradeSignal) return;

        this.isTrading = true;
        this.currentTrade = {
            ...tradeSignal,
            status: 'PENDING',
            entryTime: Date.now(),
            predictedCrashPoint: prediction.prediction
        };

        this.log(`📊 Executing trade: ${tradeSignal.betAmount} @ ${prediction.prediction}x`);
        this.log(`💰 Expected return: $${tradeSignal.expectedReturn.toFixed(2)}`);
        this.log(`🎯 Profit target: $${tradeSignal.profitTarget.toFixed(2)}`);
        this.log(`🛑 Stop loss: $${tradeSignal.stopLoss.toFixed(2)}`);

        // Simulate trade execution
        this.simulateTradeExecution(tradeSignal);

        // Emit trade event
        this.emitTradeEvent('trade-executed', this.currentTrade);
    }

    /**
     * Simulate trade execution (in real implementation, integrate with Betway API)
     */
    simulateTradeExecution(tradeSignal) {
        // In production, this would:
        // 1. Connect to Betway API
        // 2. Place bet with specified amount
        // 3. Monitor round until crash
        // 4. Calculate profit/loss

        // For now, simulate with setTimeout
        setTimeout(() => {
            this.resolveTradeSimulation(tradeSignal);
        }, 3000 + Math.random() * 7000); // Simulate 3-10 second round
    }

    /**
     * Resolve simulated trade
     */
    resolveTradeSimulation(tradeSignal) {
        const actualCrashPoint = this.getSimulatedCrashPoint();
        
        let result = {
            actualCrashPoint: actualCrashPoint,
            predictedCrashPoint: tradeSignal.prediction,
            profit: 0,
            status: 'LOST'
        };

        // Determine if trade was profitable
        if (actualCrashPoint >= this.config.stopLoss) {
            // Check if we hit profit target
            if (actualCrashPoint >= this.config.profitTarget) {
                result.profit = tradeSignal.betAmount * (actualCrashPoint - 1);
                result.status = 'WON';
                this.consecutiveLosses = 0;
            } else if (actualCrashPoint >= tradeSignal.prediction * 0.95) {
                // Close to prediction
                result.profit = tradeSignal.betAmount * (actualCrashPoint - 1) * 0.8; // 80% of potential
                result.status = 'PARTIAL_WIN';
                this.consecutiveLosses = 0;
            } else {
                result.profit = -(tradeSignal.betAmount * 0.5);
                result.status = 'LOST_SMALL';
                this.consecutiveLosses++;
            }
        } else {
            result.profit = -tradeSignal.betAmount;
            result.status = 'LOST';
            this.consecutiveLosses++;
        }

        this.recordTrade(tradeSignal, result);
        this.isTrading = false;

        this.emitTradeEvent('trade-completed', {
            ...this.currentTrade,
            result: result
        });
    }

    /**
     * Get simulated crash point (for testing)
     */
    getSimulatedCrashPoint() {
        const history = this.predictor.getRoundHistory();
        
        if (history.length === 0) {
            return 1.0 + Math.random() * 3;
        }

        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        const variance = Math.random() * 2 - 1; // -1 to 1
        
        return Math.max(1.0, avg + variance);
    }

    /**
     * Record trade in history
     */
    recordTrade(tradeSignal, result) {
        const trade = {
            id: `trade_${Date.now()}`,
            ...tradeSignal,
            ...result,
            timestamp: new Date().toISOString()
        };

        this.tradeHistory.push(trade);
        this.totalProfit += result.profit;
        this.updateStatistics();

        this.log(`✅ Trade recorded: ${result.status} | Profit: $${result.profit.toFixed(2)}`);
    }

    /**
     * Calculate bet amount based on risk management
     */
    calculateBetAmount() {
        if (this.balance === 0) {
            return this.config.minBetAmount;
        }

        const riskAmount = this.balance * (this.config.riskPercentage / 100);
        const betAmount = Math.min(riskAmount, this.config.maxBetAmount);

        return Math.max(this.config.minBetAmount, betAmount);
    }

    /**
     * Update statistics
     */
    updateStatistics() {
        if (this.tradeHistory.length === 0) return;

        const wins = this.tradeHistory.filter(t => t.status === 'WON').length;
        const partialWins = this.tradeHistory.filter(t => t.status === 'PARTIAL_WIN').length;
        const totalTrades = this.tradeHistory.length;

        this.winRate = ((wins + partialWins) / totalTrades * 100).toFixed(2);

        this.log(`📈 Statistics: Win Rate: ${this.winRate}% | Total Profit: $${this.totalProfit.toFixed(2)}`);
    }

    /**
     * Apply martingale strategy (double bet after loss)
     */
    applyMartingale(lastTrade) {
        if (lastTrade.status === 'LOST') {
            this.config.minBetAmount *= 2;
            this.log(`📊 Martingale: Doubled bet to $${this.config.minBetAmount}`);
        } else if (lastTrade.status === 'WON') {
            this.config.minBetAmount = Math.max(10, this.config.minBetAmount / 2);
            this.log(`📊 Martingale: Reset bet to $${this.config.minBetAmount}`);
        }
    }

    /**
     * Apply Kelly criterion for optimal bet sizing
     */
    applyKellyCriterion() {
        const totalTrades = this.tradeHistory.length;
        if (totalTrades < 10) return; // Need enough data

        const wins = this.tradeHistory.filter(t => t.status === 'WON').length;
        const winRate = wins / totalTrades;
        const lossRate = 1 - winRate;

        // Calculate average win/loss ratio
        const avgWin = this.tradeHistory
            .filter(t => t.profit > 0)
            .reduce((sum, t) => sum + t.profit, 0) / Math.max(1, wins);
        
        const avgLoss = Math.abs(this.tradeHistory
            .filter(t => t.profit < 0)
            .reduce((sum, t) => sum + t.profit, 0) / Math.max(1, totalTrades - wins));

        // Kelly formula: f* = (bp - q) / b
        // where b = odds, p = win rate, q = loss rate
        const odds = avgWin / avgLoss;
        const kellyFraction = (odds * winRate - lossRate) / odds;

        // Apply Kelly (usually fractional Kelly for safety)
        const safeFraction = kellyFraction * 0.25; // Quarter Kelly
        const optimalBet = this.balance * safeFraction;

        if (optimalBet > 0) {
            this.config.minBetAmount = Math.max(10, Math.min(optimalBet, this.config.maxBetAmount));
            this.log(`📊 Kelly Criterion: Optimal bet size: $${this.config.minBetAmount.toFixed(2)}`);
        }
    }

    /**
     * Apply hedging strategy
     */
    applyHedging(prediction) {
        if (!this.config.enableHedging) return;

        // Create two bets: one at predicted value, one at lower multiplier
        const mainBet = {
            amount: this.calculateBetAmount() * 0.7,
            target: prediction.prediction
        };

        const hedgeBet = {
            amount: this.calculateBetAmount() * 0.3,
            target: prediction.prediction * 0.7
        };

        this.log(`🛡️ Hedging: Main bet $${mainBet.amount} @ ${mainBet.target}x, Hedge $${hedgeBet.amount} @ ${hedgeBet.target}x`);

        return { mainBet, hedgeBet };
    }

    /**
     * Emit trade event
     */
    emitTradeEvent(eventName, detail) {
        const event = new CustomEvent(`aviator-trade:${eventName}`, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Get trade history
     */
    getTradeHistory() {
        return this.tradeHistory;
    }

    /**
     * Get statistics
     */
    getStatistics() {
        const totalTrades = this.tradeHistory.length;
        const wins = this.tradeHistory.filter(t => t.status === 'WON').length;
        const losses = totalTrades - wins;
        const avgProfit = totalTrades > 0 ? this.totalProfit / totalTrades : 0;

        return {
            totalTrades,
            wins,
            losses,
            winRate: this.winRate,
            totalProfit: this.totalProfit,
            avgProfit: avgProfit,
            consecutiveLosses: this.consecutiveLosses,
            currentBalance: this.balance
        };
    }

    /**
     * Set balance
     */
    setBalance(amount) {
        this.balance = amount;
        this.log(`💰 Balance set to: $${amount.toFixed(2)}`);
    }

    /**
     * Enable/disable trading
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        this.log(enabled ? '✅ Trading enabled' : '❌ Trading disabled');
    }

    /**
     * Export trade data
     */
    exportData(format = 'json') {
        const data = {
            exportDate: new Date().toISOString(),
            statistics: this.getStatistics(),
            tradeHistory: this.tradeHistory,
            configuration: this.config
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }

        return data;
    }

    /**
     * Log utility
     */
    log(...args) {
        if (this.config.logTrades) {
            console.log('[AviatorTradingBot]', ...args);
        }
    }

    /**
     * Reset bot
     */
    reset() {
        this.tradeHistory = [];
        this.balance = 0;
        this.consecutiveLosses = 0;
        this.isTrading = false;
        this.currentTrade = null;
        this.totalProfit = 0;
        this.winRate = 0;
        this.log('🔄 Trading bot reset');
    }
}

/**
 * Risk Management Module
 */
class RiskManager {
    constructor(config = {}) {
        this.config = {
            maxDailyLoss: config.maxDailyLoss || 500,
            maxSingleTradeLoss: config.maxSingleTradeLoss || 100,
            minWinRateToTrade: config.minWinRateToTrade || 0.45,
            volatilityThreshold: config.volatilityThreshold || 0.5,
            ...config
        };

        this.dailyLoss = 0;
        this.dayStartTime = Date.now();
    }

    /**
     * Check if trade is allowed
     */
    canTrade(prediction, currentBalance, winRate) {
        // Check daily loss limit
        if (Math.abs(this.dailyLoss) >= this.config.maxDailyLoss) {
            console.log('🛑 Daily loss limit reached');
            return false;
        }

        // Check minimum win rate
        if (winRate < this.config.minWinRateToTrade) {
            console.log(`🛑 Win rate too low: ${(winRate * 100).toFixed(1)}%`);
            return false;
        }

        // Check volatility
        if (prediction.volatility > this.config.volatilityThreshold) {
            console.log(`🛑 Volatility too high: ${prediction.volatility.toFixed(2)}`);
            return false;
        }

        return true;
    }

    /**
     * Record trade loss
     */
    recordLoss(lossAmount) {
        this.dailyLoss += lossAmount;
        
        // Reset daily loss at midnight
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0);
        
        const timeToMidnight = nextMidnight - now;
        setTimeout(() => {
            this.dailyLoss = 0;
            this.dayStartTime = Date.now();
        }, timeToMidnight);
    }

    /**
     * Get remaining daily loss budget
     */
    getRemainingDailyBudget() {
        return this.config.maxDailyLoss - Math.abs(this.dailyLoss);
    }
}

/**
 * Performance Analytics Module
 */
class PerformanceAnalytics {
    constructor(tradingBot) {
        this.bot = tradingBot;
    }

    /**
     * Calculate Sharpe Ratio
     */
    calculateSharpeRatio(riskFreeRate = 0.02) {
        const trades = this.bot.tradeHistory;
        if (trades.length < 2) return 0;

        const returns = trades.map(t => t.profit);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        return (avgReturn - riskFreeRate) / stdDev;
    }

    /**
     * Calculate Drawdown
     */
    calculateMaxDrawdown() {
        const trades = this.bot.tradeHistory;
        if (trades.length === 0) return 0;

        let peak = 0;
        let maxDrawdown = 0;
        let runningTotal = 0;

        trades.forEach(trade => {
            runningTotal += trade.profit;
            
            if (runningTotal > peak) {
                peak = runningTotal;
            } else {
                const drawdown = peak - runningTotal;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        });

        return maxDrawdown;
    }

    /**
     * Calculate Profit Factor
     */
    calculateProfitFactor() {
        const trades = this.bot.tradeHistory;
        
        const grossProfit = trades
            .filter(t => t.profit > 0)
            .reduce((sum, t) => sum + t.profit, 0);

        const grossLoss = Math.abs(trades
            .filter(t => t.profit < 0)
            .reduce((sum, t) => sum + t.profit, 0));

        return grossLoss === 0 ? 0 : grossProfit / grossLoss;
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const stats = this.bot.getStatistics();
        
        return {
            ...stats,
            sharpeRatio: this.calculateSharpeRatio().toFixed(2),
            maxDrawdown: this.calculateMaxDrawdown().toFixed(2),
            profitFactor: this.calculateProfitFactor().toFixed(2),
            expectancy: (stats.totalProfit / Math.max(1, stats.totalTrades)).toFixed(2)
        };
    }
}

// Export classes
window.AviatorTradingBot = AviatorTradingBot;
window.RiskManager = RiskManager;
window.PerformanceAnalytics = PerformanceAnalytics;

// Auto-initialize if predictor exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.aviatorPredictor) {
            window.tradingBot = new AviatorTradingBot(window.aviatorPredictor, {
                enabled: true,
                tradeOnConfidence: 0.75,
                minBetAmount: 10,
                maxBetAmount: 1000,
                riskPercent: 2
            });
            
            window.riskManager = new RiskManager();
            window.performanceAnalytics = new PerformanceAnalytics(window.tradingBot);
            
            console.log('✅ Trading bot initialized');
        }
    });
} else {
    if (window.aviatorPredictor) {
        window.tradingBot = new AviatorTradingBot(window.aviatorPredictor, {
            enabled: true,
            tradeOnConfidence: 0.75,
            minBetAmount: 10,
            maxBetAmount: 1000,
            riskPercent: 2
        });
        
        window.riskManager = new RiskManager();
        window.performanceAnalytics = new PerformanceAnalytics(window.tradingBot);
    }
}
