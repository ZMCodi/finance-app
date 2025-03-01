'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DefaultService, PortfolioStats, RiskPlots } from '@/src/api';
import dynamic from 'next/dynamic';

interface RiskTabProps {
  portfolioId: string;
  currency: string;
  portfolioData?: PortfolioStats;
  plotData?: RiskPlots | null;
}

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div>Loading...</div>, 
});

const RiskTab = ({ portfolioId, currency, portfolioData, plotData }: RiskTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [drawdownMetrics, setDrawdownMetrics] = useState<any>(null);
  const [riskPlots, setRiskPlots] = useState<RiskPlots | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // If portfolioData is provided, use it
        if (portfolioData && portfolioData.risk && portfolioData.drawdown) {
          setRiskMetrics(portfolioData.risk);
          setDrawdownMetrics(portfolioData.drawdown);
          
          if (plotData) {
            setRiskPlots(plotData);
          }
        } else {
          // Otherwise fetch it
          const stats = await DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(portfolioId);
          
          // Fetch plot data
          const plots = await DefaultService.portfolioPlotsApiPortfolioPortfolioIdPlotsGet(portfolioId);
          
          if (stats && stats.risk && stats.drawdown) {
            setRiskMetrics(stats.risk);
            setDrawdownMetrics(stats.drawdown);
          } if (plots && plots.risk) {
            setRiskPlots(plots.risk);
          }
        }
      } catch (error) {
        console.error('Error fetching risk data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [portfolioId, portfolioData, plotData]);
  
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
          <div className="h-64">
        {riskPlots?.risk_decomposition ? (
          <Plot 
            data={riskPlots.risk_decomposition.data}
            layout={{
          ...riskPlots.risk_decomposition.layout,
          autosize: true,
          margin: { t: 0, r: 0, b: 0, l: 0 },
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
          <div className="h-full rounded-md flex items-center justify-center bg-slate-800">
            <p className="text-slate-400">No risk decomposition data available</p>
          </div>
        )}
          </div>
        </CardContent>
      </Card>
      
      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <span className="text-slate-400">Tracking Error</span>
                <span className="font-semibold">
                  {riskMetrics.tracking_error.toFixed(2)}
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
                <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Longest Drawdown</span>
                  <span className="font-semibold">
                  {drawdownMetrics.longest_drawdown_duration?.duration || 'N/A'} days
                  </span>
                </div>
                {drawdownMetrics.longest_drawdown_duration?.duration && (
                  <div className="text-sm text-slate-500 pl-2">
                  From {drawdownMetrics.longest_drawdown_duration.start} to {drawdownMetrics.longest_drawdown_duration.end}
                  </div>
                )}
                </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Average Drawdown</span>
                <span className="font-semibold text-red-500">
                  {(drawdownMetrics.average_drawdown * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Calmar Ratio</span>
                <span className="font-semibold">
                  {drawdownMetrics.calmar_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Drawdown Ratio</span>
                <span className="font-semibold">
                  {drawdownMetrics.drawdown_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Avg. Recovery Time</span>
                <span className="font-semibold">
                  {drawdownMetrics.time_to_recovery || 'N/A'} days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Drawdown Charts */}
        <Card className='col-span-2'>
          <CardHeader>
            <CardTitle>Drawdown Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col gap-4'>
              {/* Drawdown Plot */}
              <div className="h-[150px]">
                {riskPlots?.drawdown_plot ? (
                  <Plot 
                    data={riskPlots.drawdown_plot.data}
                    layout={{
                      ...riskPlots.drawdown_plot.layout,
                      autosize: true,
                      margin: { t: 0, r: 0, b: 0, l: 0 },
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
                  <div className="h-full rounded-md flex items-center justify-center bg-slate-800">
                    <p className="text-slate-400">No drawdown data available</p>
                  </div>
                )}
              </div>
              
              {/* Drawdown Frequency */}
              <div className="h-[150px]">
                {riskPlots?.drawdown_frequency ? (
                  <Plot 
                    data={riskPlots.drawdown_frequency.data}
                    layout={{
                      ...riskPlots.drawdown_frequency.layout,
                      autosize: true,
                      margin: { t: 0, r: 0, b: 0, l: 0 },
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
                  <div className="h-full rounded-md flex items-center justify-center bg-slate-800">
                    <p className="text-slate-400">No frequency data available</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskTab;