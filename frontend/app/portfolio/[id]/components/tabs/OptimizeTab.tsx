'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw } from 'lucide-react';
import { DefaultService } from '@/src/api';

interface OptimizeTabProps {
  portfolioId: string;
  currency: string;
}

interface OptimizationResults {
  opt_returns: number;
  opt_volatility: number;
  opt_sharpe_ratio: number;
  opt_weights: Record<string, number>;
  ef_results: {
    efficient_frontier: any;
    returns: number[];
    volatilities: number[];
    sharpe_ratios: number[];
    weights: Record<string, number>[];
  };
}

const OptimizeTab = ({ portfolioId, currency }: OptimizeTabProps) => {
  const [minAllocation, setMinAllocation] = useState<number[]>([0]);
  const [maxAllocation, setMaxAllocation] = useState<number[]>([100]);
  const [points, setPoints] = useState<number[]>([50]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResults | null>(null);
  
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

  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      
      // Call the API to optimize the portfolio
      const results = await DefaultService.optimizePortfolioApiPortfolioPortfolioIdOptimizeGet(
        portfolioId,
        minAllocation[0] / 100, // Convert to decimal
        maxAllocation[0] / 100, // Convert to decimal
        points[0]
      );
      
      setOptimizationResults(results);
    } catch (error) {
      console.error('Error optimizing portfolio:', error);
    } finally {
      setOptimizing(false);
    }
  };
  
  const handleRebalance = async () => {
    if (!optimizationResults) return;
    
    try {
      // Call API to rebalance portfolio based on optimized weights
      const rebalanceResponse = await DefaultService.rebalanceApiPortfolioPortfolioIdRebalancePost(
        portfolioId,
        optimizationResults.opt_weights
      );
      
      // After rebalance, we should parse these transactions
      if (rebalanceResponse) {
        await DefaultService.parseTransactionsApiPortfolioPortfolioIdParseTransactionsPatch(
          portfolioId,
          { transactions: rebalanceResponse.transactions }
        );
        
        alert('Portfolio successfully rebalanced to optimal weights');
      }
    } catch (error) {
      console.error('Error rebalancing portfolio:', error);
      alert('Failed to rebalance portfolio. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Portfolio Optimization</h2>
      
      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-slate-400">Minimum Allocation</label>
                <span>{minAllocation[0]}%</span>
              </div>
              <Slider
                value={minAllocation}
                min={0}
                max={50}
                step={1}
                onValueChange={setMinAllocation}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-slate-400">Maximum Allocation</label>
                <span>{maxAllocation[0]}%</span>
              </div>
              <Slider
                value={maxAllocation}
                min={10}
                max={100}
                step={1}
                onValueChange={setMaxAllocation}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm text-slate-400">Efficient Frontier Points</label>
                <span>{points[0]}</span>
              </div>
              <Slider
                value={points}
                min={10}
                max={100}
                step={5}
                onValueChange={setPoints}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleOptimize}
              disabled={optimizing}
            >
              {optimizing ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" /> 
                  Optimizing...
                </>
              ) : 'Optimize Portfolio'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Optimization Results */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className='col-span-3'>
          <CardHeader>
            <CardTitle>Efficient Frontier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-800 h-[450px] rounded-md flex items-center justify-center">
              <p className="text-slate-400">Efficient Frontier Chart will appear here</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Optimal Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {optimizationResults ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Expected Returns</span>
                  <span className="text-green-500 font-semibold">
                    {(optimizationResults.opt_returns * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Expected Volatility</span>
                  <span className="text-red-500 font-semibold">
                    {(optimizationResults.opt_volatility * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Sharpe Ratio</span>
                  <span className="font-semibold">
                    {optimizationResults.opt_sharpe_ratio.toFixed(2)}
                  </span>
                </div>
                
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2 text-slate-400">Optimal Weights</h4>
                    <div className="max-h-60 overflow-y-auto">
                      <Table>
                      <TableBody>
                        {Object.entries(optimizationResults.opt_weights)
                        .sort(([, a], [, b]) => b - a)
                        .map(([asset, weight]) => (
                          <TableRow key={asset}>
                          <TableCell>{asset}</TableCell>
                          <TableCell className="text-right">
                            {(weight * 100).toFixed(1)}%
                          </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={handleRebalance}
                >
                  Rebalance to Optimal
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                Run optimization to see results
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OptimizeTab;