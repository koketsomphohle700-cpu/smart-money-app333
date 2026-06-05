// Trade Engine - Entry/Exit Management
class TradeEngine {
    constructor() {
        this.activeTrades = [];
        this.tradeHistory = [];
    }

    // Calculate entry, exit and TP/SL levels
    calculateLevels(currentPrice, direction, riskPercent, atrValue, smc) {
        const riskAmount = currentPrice * (riskPercent / 100);
        
        let entry, stopLoss, tp1, tp2, tp3;
        
        if (direction === 'long') {
            stopLoss = currentPrice - atrValue;
            const riskDistance = currentPrice - stopLoss;
            
            entry = currentPrice;
            tp1 = currentPrice + (riskDistance * 1.0);
            tp2 = currentPrice + (riskDistance * 2.0);
            tp3 = currentPrice + (riskDistance * 3.0);
        } else {
            stopLoss = currentPrice + atrValue;
            const riskDistance = stopLoss - currentPrice;
            
            entry = currentPrice;
            tp1 = currentPrice - (riskDistance * 1.0);
            tp2 = currentPrice - (riskDistance * 2.0);
            tp3 = currentPrice - (riskDistance * 3.0);
        }
        
        // Adjust based on SMC levels
        if (smc && smc.orderBlocks && smc.orderBlocks.length > 0) {
            const nearestOB = smc.orderBlocks[smc.orderBlocks.length - 1];
            if (direction === 'long' && nearestOB.type === 'bullish') {
                entry = Math.max(entry, nearestOB.low);
            } else if (direction === 'short' && nearestOB.type === 'bearish') {
                entry = Math.min(entry, nearestOB.high);
            }
        }
        
        return {
            entry: parseFloat(entry.toFixed(5)),
            stopLoss: parseFloat(stopLoss.toFixed(5)),
            tp1: parseFloat(tp1.toFixed(5)),
            tp2: parseFloat(tp2.toFixed(5)),
            tp3: parseFloat(tp3.toFixed(5)),
            riskReward: this.calculateRiskReward(entry, stopLoss, tp1)
        };
    }

    // Calculate Risk/Reward ratio
    calculateRiskReward(entry, stopLoss, takeProfit) {
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(takeProfit - entry);
        return (reward / risk).toFixed(2);
    }

    // Determine trading direction and bias
    determineBiasAndDirection(smc, ta, prices) {
        let bias = 'NEUTRAL';
        let direction = 'NONE';
        let confidence = 0;
        let reasons = [];
        
        // SMC Analysis
        if (smc.orderBlocks.length > 0) {
            const latestOB = smc.orderBlocks[smc.orderBlocks.length - 1];
            if (latestOB.type === 'bullish') {
                bias = 'BULLISH';
                confidence += 25;
                reasons.push(`Bullish Order Block (${latestOB.strength.toFixed(0)}%)`);
            } else {
                bias = 'BEARISH';
                confidence += 25;
                reasons.push(`Bearish Order Block (${latestOB.strength.toFixed(0)}%)`);
            }
        }
        
        // Recent BOS
        if (smc.bos.length > 0 && smc.bos[smc.bos.length - 1].index > prices.length - 5) {
            if (smc.bos[smc.bos.length - 1].type === 'bullish') {
                bias = 'BULLISH';
                confidence += 15;
                reasons.push('Bullish Break of Structure');
            } else {
                bias = 'BEARISH';
                confidence += 15;
                reasons.push('Bearish Break of Structure');
            }
        }
        
        // ADX Trend
        if (ta.adx && ta.adx.length > 0) {
            const latestADX = ta.adx[ta.adx.length - 1];
            if (latestADX.adx > 25) {
                confidence += 15;
                if (latestADX.plusDI > latestADX.minusDI) {
                    if (bias === 'BULLISH') direction = 'LONG';
                    reasons.push(`Strong ADX Trend: ${latestADX.adx.toFixed(0)} (${latestADX.plusDI > latestADX.minusDI ? 'Bullish' : 'Bearish'})`);
                } else {
                    if (bias === 'BEARISH') direction = 'SHORT';
                }
            }
        }
        
        // RSI Confluence
        if (ta.rsi && ta.rsi.length > 0) {
            const latestRSI = ta.rsi[ta.rsi.length - 1].value;
            if (latestRSI > 60 && bias === 'BULLISH') {
                confidence += 10;
                reasons.push(`RSI Overbought Pullback: ${latestRSI.toFixed(0)}`);
            } else if (latestRSI < 40 && bias === 'BEARISH') {
                confidence += 10;
                reasons.push(`RSI Oversold Bounce: ${latestRSI.toFixed(0)}`);
            }
        }
        
        // MACD Crossover
        if (ta.macd && ta.macd.macd && ta.macd.signal) {
            if (ta.macd.lastCrossover === 'bullish' && bias === 'BULLISH') {
                confidence += 10;
                reasons.push('MACD Bullish Crossover');
                direction = 'LONG';
            } else if (ta.macd.lastCrossover === 'bearish' && bias === 'BEARISH') {
                confidence += 10;
                reasons.push('MACD Bearish Crossover');
                direction = 'SHORT';
            }
        }
        
        // Confluence Score
        if (smc.confluenceScore) {
            confidence += smc.confluenceScore.totalScore * 0.1;
            reasons.push(`SMC Confluence: ${smc.confluenceScore.totalScore.toFixed(0)}%`);
        }
        
        // Determine direction if not already set
        if (direction === 'NONE' && bias !== 'NEUTRAL') {
            direction = bias === 'BULLISH' ? 'LONG' : 'SHORT';
        }
        
        return {
            bias: bias,
            direction: direction,
            confidence: Math.min(100, confidence),
            reasons: reasons
        };
    }

    // Generate AI prediction text
    generatePrediction(biasData, levels, pair, timeframe) {
        const {direction, confidence, reasons} = biasData;
        
        if (direction === 'NONE') {
            return {
                prediction: `${pair} is showing ${biasData.bias} bias on the ${timeframe} timeframe. Waiting for confluence signals to form a trade setup.`,
                reasons: reasons
            };
        }
        
        const action = direction === 'LONG' ? 'BUY' : 'SELL';
        const rr = levels.riskReward;
        
        let prediction = `🎯 SIGNAL: ${action} ${pair}\n\n`;
        prediction += `📊 Timeframe: ${timeframe}\n`;
        prediction += `💡 Bias: ${biasData.bias} | Confidence: ${confidence.toFixed(0)}%\n`;
        prediction += `\n📈 Trade Setup:\n`;
        prediction += `• Entry: ${levels.entry.toFixed(5)}\n`;
        prediction += `• Stop Loss: ${levels.stopLoss.toFixed(5)}\n`;
        prediction += `• TP1: ${levels.tp1.toFixed(5)} | Risk/Reward: 1:${rr}\n`;
        prediction += `• TP2: ${levels.tp2.toFixed(5)} | Risk/Reward: 1:${(rr * 2).toFixed(2)}\n`;
        prediction += `• TP3: ${levels.tp3.toFixed(5)} | Risk/Reward: 1:${(rr * 3).toFixed(2)}\n`;
        
        return {
            prediction: prediction,
            reasons: reasons
        };
    }

    // Create new trade
    createTrade(symbol, direction, entry, stopLoss, tp1, tp2, tp3, lotSize) {
        const trade = {
            id: Date.now(),
            symbol: symbol,
            direction: direction,
            entry: entry,
            stopLoss: stopLoss,
            tp1: tp1,
            tp2: tp2,
            tp3: tp3,
            lotSize: lotSize,
            openTime: new Date(),
            status: 'open',
            pnl: 0,
            roi: 0
        };
        
        this.activeTrades.push(trade);
        return trade;
    }

    // Update trade with current price
    updateTrade(tradeId, currentPrice) {
        const trade = this.activeTrades.find(t => t.id === tradeId);
        if (!trade) return null;
        
        if (trade.direction === 'LONG') {
            trade.pnl = (currentPrice - trade.entry) * trade.lotSize;
            trade.roi = ((currentPrice - trade.entry) / trade.entry * 100).toFixed(2);
            
            if (currentPrice >= trade.tp3) {
                trade.status = 'closed_tp3';
            } else if (currentPrice >= trade.tp2) {
                trade.status = 'tp2_hit';
            } else if (currentPrice >= trade.tp1) {
                trade.status = 'tp1_hit';
            } else if (currentPrice <= trade.stopLoss) {
                trade.status = 'closed_sl';
            }
        } else {
            trade.pnl = (trade.entry - currentPrice) * trade.lotSize;
            trade.roi = ((trade.entry - currentPrice) / trade.entry * 100).toFixed(2);
            
            if (currentPrice <= trade.tp3) {
                trade.status = 'closed_tp3';
            } else if (currentPrice <= trade.tp2) {
                trade.status = 'tp2_hit';
            } else if (currentPrice <= trade.tp1) {
                trade.status = 'tp1_hit';
            } else if (currentPrice >= trade.stopLoss) {
                trade.status = 'closed_sl';
            }
        }
        
        return trade;
    }

    // Get trades table HTML
    getTradesHTML() {
        if (this.activeTrades.length === 0) {
            return '<p>No active trades</p>';
        }
        
        let html = '<table>';
        html += '<tr><th>Symbol</th><th>Direction</th><th>Entry</th><th>SL</th><th>TP1</th><th>P&L</th><th>ROI</th><th>Status</th></tr>';
        
        this.activeTrades.forEach(trade => {
            const pnlColor = trade.pnl >= 0 ? '#16a34a' : '#dc2626';
            html += `<tr>
                <td>${trade.symbol}</td>
                <td>${trade.direction}</td>
                <td>${trade.entry.toFixed(5)}</td>
                <td>${trade.stopLoss.toFixed(5)}</td>
                <td>${trade.tp1.toFixed(5)}</td>
                <td style="color: ${pnlColor};">${trade.pnl.toFixed(2)}</td>
                <td style="color: ${pnlColor};">${trade.roi}%</td>
                <td>${trade.status}</td>
            </tr>`;
        });
        
        html += '</table>';
        return html;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradeEngine;
}
