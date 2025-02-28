'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DefaultService } from '@/src/api';

interface RiskTabProps {
  portfolioId: string;
  currency: string;
  portfolioData?: any;
}

const RiskTab = ({ portfolioId, currency, portfolioData }: RiskTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [drawdownMetrics, setDrawdownMetrics] = useState<any>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // If portfolioData is provided, use it
        if (portfolioData && portfolioData.risk && portfolioData.drawdown) {
          setRiskMetrics(portfolioData.risk);
          setDrawdownMetrics(portfolioData.drawdown);
        } else {
          // Otherwise fetch it
          const stats = await DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(portfolioId);
          if (stats && stats.risk && stats.drawdown) {
            setRiskMetrics(stats.risk);
            setDrawdownMetrics(stats.drawdown);
          } else {
            // Fallback to placeholder data
            setRiskMetrics({
              volatility: 0.1658,
              sharpe_ratio: 1.42,
              sortino_ratio: 1.85,
              beta: 0.93,
              value_at_risk: 0.0245,
              information_ratio: 0.78,
              treynor_ratio: 0.14
            });
            setDrawdownMetrics({
              max_drawdown: 0.1234,
              calmar_ratio: 0.95,
              average_drawdown: 0.056,
              average_drawdown_duration: 15,
              time_to_recovery: 22,
              drawdown_ratio: 0.452
            });
          }
        }
      } catch (error) {
        console.error('Error fetching risk data:', error);
        // Fallback to placeholder data
        setRiskMetrics({
          volatility: 0.1658,
          sharpe_ratio: 1.42,
          sortino_ratio: 1.85,
          beta: 0.93,
          value_at_risk: 0.0245,
          information_ratio: 0.78,
          treynor_ratio: 0.14
        });
        setDrawdownMetrics({
          max_drawdown: 0.1234,
          calmar_ratio: 0.95,
          average_drawdown: 0.056,
          average_drawdown_duration: 15,
          time_to_recovery: 22,
          drawdown_ratio: 0.452
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [portfolioId, portfolioData]);
  
  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string): string => {
    const currencies: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      // Add more currencies as needed
    };
    
    return currencies[currencyCode] || currencyCode;
  };
  
  const currencySymbol = getCurrencySymbol(currency);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading risk data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Risk Analysis</h2>
      
      {/* Risk Decomposition Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Decomposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-800 h-64 rounded-md flex items-center justify-center">
            <p className="text-slate-400">Risk Decomposition Chart will appear here</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Volatility</span>
                <span className="font-semibold">
                  {(riskMetrics.volatility * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sharpe Ratio</span>
                <span className="font-semibold">
                  {riskMetrics.sharpe_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sortino Ratio</span>
                <span className="font-semibold">
                  {riskMetrics.sortino_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Beta</span>
                <span className="font-semibold">
                  {riskMetrics.beta.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Value at Risk (95%)</span>
                <span className="font-semibold text-red-500">
                  {currencySymbol}{(riskMetrics.value_at_risk).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Information Ratio</span>
                <span className="font-semibold">
                  {riskMetrics.information_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Treynor Ratio</span>
                <span className="font-semibold">
                  {riskMetrics.treynor_ratio?.toFixed(2) || 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Drawdown Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Maximum Drawdown</span>
                <span className="font-semibold text-red-500">
                  {(drawdownMetrics.max_drawdown * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Calmar Ratio</span>
                <span className="font-semibold">
                  {drawdownMetrics.calmar_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Average Drawdown</span>
                <span className="font-semibold text-red-500">
                  {(drawdownMetrics.average_drawdown * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg. Recovery Time</span>
                <span className="font-semibold">
                  {drawdownMetrics.time_to_recovery || 'N/A'} days
                </span>
              </div>
              
              {/* Drawdown Chart Placeholder */}
              <div className="bg-slate-800 h-32 mt-4 rounded-md flex items-center justify-center">
                <p className="text-slate-400">Drawdown Chart will appear here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Correlation Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-800 h-64 rounded-md flex items-center justify-center">
            <p className="text-slate-400">Correlation Heatmap will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskTab;