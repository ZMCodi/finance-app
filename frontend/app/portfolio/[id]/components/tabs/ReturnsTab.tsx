'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DefaultService, PerformanceMetrics, PortfolioStats, ReturnsPlots } from '@/src/api';
import dynamic from 'next/dynamic';

interface ReturnsTabProps {
  portfolioId: string;
  portfolioData: PortfolioStats;
  plotData?: ReturnsPlots | null;
}

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div className='h-full flex items-center justify-center'>Loading...</div>,
});

const ReturnsTab = ({ portfolioId, portfolioData, plotData }: ReturnsTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [returnsPlot, setReturnsPlot] = useState<ReturnsPlots | null>(null);
  const [chartType, setChartType] = useState<'returns' | 'pnl'>('returns');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // If portfolioData is provided, use it
        if (portfolioData && portfolioData.performance && plotData) {
          setPerformanceMetrics(portfolioData.performance);
          setReturnsPlot(plotData);
        } else {
          // Otherwise fetch it
          const stats = await DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(portfolioId);
          const plots = await DefaultService.portfolioPlotsApiPortfolioPortfolioIdPlotsGet(portfolioId);
          
          if (stats && stats.performance) {
            setPerformanceMetrics(stats.performance);
          }
          
          if (plots && plots.returns) {
            setReturnsPlot(plots.returns);
          }
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [portfolioId, portfolioData, plotData]);

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
      
      {/* Returns/PnL Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Returns Over Time</CardTitle>
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${chartType === 'returns' ? 'font-medium' : 'text-slate-500'}`}>
              Returns
            </span>
            <Switch
              checked={chartType === 'pnl'}
              onCheckedChange={(checked) => setChartType(checked ? 'pnl' : 'returns')}
            />
            <span className={`text-sm ${chartType === 'pnl' ? 'font-medium' : 'text-slate-500'}`}>
              PnL
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          {returnsPlot ? (
            chartType === 'returns' ? (
              returnsPlot.returns_chart ? (
                <Plot 
                  data={returnsPlot.returns_chart.data}
                  layout={{
                    ...returnsPlot.returns_chart.layout,
                    autosize: true,
                    margin: { t: 0, r: 40, b: 40, l: 70 },
                  }}
                  config={{
                    responsive: true,
                    displaylogo: false,
                    displayModeBar: false,
                    logging: 0
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full rounded-md flex items-center justify-center">
                  <p className="text-slate-400">No returns data available</p>
                </div>
              )
            ) : (
              returnsPlot.pnl_chart ? (
                <Plot 
                  data={returnsPlot.pnl_chart.data}
                  layout={{
                    ...returnsPlot.pnl_chart.layout,
                    autosize: true,
                    margin: { t: 0, r: 40, b: 40, l: 70 },
                  }}
                  config={{
                    responsive: true,
                    displaylogo: false,
                    displayModeBar: false,
                    logging: 0
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full rounded-md flex items-center justify-center">
                  <p className="text-slate-400">No PnL data available</p>
                </div>
              )
            )
          ) : (
            <div className="h-full rounded-md flex items-center justify-center">
              <p className="text-slate-400">Chart data is loading...</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
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
        <Card className='col-span-2 h-96'>
          <CardHeader>
            <CardTitle>Returns Distribution</CardTitle>
          </CardHeader>
          <CardContent className='h-full p-0'>
            {returnsPlot?.returns_dist ? (
              <Plot 
              className='h-full'
              data={returnsPlot.returns_dist.data}
              layout={{
                ...returnsPlot.returns_dist.layout,
                autosize: true,
                margin: { t: 0, r: 40, b: 120, l: 70 },
              }}
              config={{
                displayModeBar: false,
                displaylogo: false,
                responsive: true,
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center">
          <p className="text-slate-400">No distribution data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReturnsTab;