'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DefaultService } from '@/src/api';

interface ReturnsTabProps {
  portfolioId: string;
  currency: string;
  portfolioData?: any;
}

const ReturnsTab = ({ portfolioId, currency, portfolioData }: ReturnsTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // If portfolioData is provided, use it
        if (portfolioData && portfolioData.performance) {
          setPerformanceMetrics(portfolioData.performance);
        } else {
          // Otherwise fetch it
          const stats = await DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(portfolioId);
          if (stats && stats.performance) {
            setPerformanceMetrics(stats.performance);
          }
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);;
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
        <p className="text-slate-400">Loading returns data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Portfolio Returns</h2>
      
      {/* Returns Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Returns Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-800 h-64 rounded-md flex items-center justify-center">
            <p className="text-slate-400">Returns Line Chart will appear here</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Returns</span>
                <span className={`font-semibold ${performanceMetrics.total_returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {performanceMetrics.total_returns >= 0 ? '+' : ''}
                  {(performanceMetrics.total_returns * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trading Returns</span>
                <span className={`font-semibold ${performanceMetrics.trading_returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {performanceMetrics.trading_returns >= 0 ? '+' : ''}
                  {(performanceMetrics.trading_returns * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Annualized Returns</span>
                <span className={`font-semibold ${performanceMetrics.annualized_returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {performanceMetrics.annualized_returns >= 0 ? '+' : ''}
                  {(performanceMetrics.annualized_returns * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Daily Volatility</span>
                <span className="font-semibold">
                  {(performanceMetrics.daily_returns?.std * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Best Day</span>
                <span className="text-green-500 font-semibold">
                  +{(performanceMetrics.best_day * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Worst Day</span>
                <span className="text-red-500 font-semibold">
                  {(performanceMetrics.worst_day * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Positive Days</span>
                <span className="font-semibold">
                  {(performanceMetrics.positive_days * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Returns Distribution Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Returns Distribution Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
              <span className="text-slate-400">Mean Daily Return</span>
              <span className={`font-semibold ${performanceMetrics.daily_returns?.mean >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {performanceMetrics.daily_returns?.mean >= 0 ? '+' : ''}
                {(performanceMetrics.daily_returns?.mean * 100).toFixed(2)}%
              </span>
              </div>
              <div className="flex justify-between items-center">
              <span className="text-slate-400">Median Daily Return</span>
              <span className={`font-semibold ${performanceMetrics.daily_returns?.median >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {performanceMetrics.daily_returns?.median >= 0 ? '+' : ''}
                {(performanceMetrics.daily_returns?.median * 100).toFixed(2)}%
              </span>
              </div>
              <div className="flex justify-between items-center">
              <span className="text-slate-400">Skewness</span>
              <span className="font-semibold">
                {performanceMetrics.daily_returns?.skewness.toFixed(2)}
              </span>
              </div>
              <div className="flex justify-between items-center">
              <span className="text-slate-400">Kurtosis</span>
              <span className="font-semibold">
                {performanceMetrics.daily_returns?.kurtosis.toFixed(2)}
              </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Returns Distribution */}
        <Card className='col-span-2'>
          <CardHeader>
            <CardTitle>Returns Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-800 h-64 rounded-md flex items-center justify-center">
              <p className="text-slate-400">Returns Distribution Histogram will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReturnsTab;