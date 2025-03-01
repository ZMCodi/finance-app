'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw } from 'lucide-react';
import { DefaultService, PortfolioOptimize } from '@/src/api';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div>Loading...</div>, 
});

type PortfolioType = 'optimal' | 'target-returns' | 'target-volatility' | 'min-volatility';

interface OptimizeTabProps {
  portfolioId: string;
  currency: string;
}

const OptimizeTab = ({ portfolioId, currency }: OptimizeTabProps) => {
  const [minAllocation, setMinAllocation] = useState<number[]>([0]);
  const [maxAllocation, setMaxAllocation] = useState<number[]>([100]);
  const [points, setPoints] = useState<number[]>([50]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<PortfolioOptimize | null>(null);
  const [portfolioType, setPortfolioType] = useState<PortfolioType>('optimal');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Dialog states
  const [returnsDialogOpen, setReturnsDialogOpen] = useState(false);
  const [volatilityDialogOpen, setVolatilityDialogOpen] = useState(false);
  const [targetReturns, setTargetReturns] = useState<string>('');
  const [targetVolatility, setTargetVolatility] = useState<string>('');
  
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
      // Determine which weights to use based on the selected portfolio type
      let weights;
      
      if (portfolioType === 'optimal') {
        weights = optimizationResults.opt_weights;
      } else if (selectedIndex !== null && optimizationResults.ef_results.weights[selectedIndex]) {
        weights = optimizationResults.ef_results.weights[selectedIndex];
      } else {
        weights = optimizationResults.opt_weights;
      }
      
      // Call API to rebalance portfolio based on selected weights
      const rebalanceResponse = await DefaultService.rebalanceApiPortfolioPortfolioIdRebalancePost(
        portfolioId,
        weights
      );
      
      // After rebalance, we should parse these transactions
      if (rebalanceResponse) {
        await DefaultService.parseTransactionsApiPortfolioPortfolioIdParseTransactionsPatch(
          portfolioId,
          { transactions: rebalanceResponse.transactions }
        );
        
        alert('Portfolio successfully rebalanced to selected weights');
      }
    } catch (error) {
      console.error('Error rebalancing portfolio:', error);
      alert('Failed to rebalance portfolio. Please try again.');
    }
  };

  // Find the closest value in an array to the target value
  const findClosestIndex = (arr: number[], target: number): number => {
    if (!arr || arr.length === 0) return -1;
    
    let closest = 0;
    let closestDiff = Math.abs(arr[0] - target);
    
    for (let i = 1; i < arr.length; i++) {
      const diff = Math.abs(arr[i] - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = i;
      }
    }
    
    return closest;
  };
  
  // Handle portfolio type change
  const handlePortfolioTypeChange = (type: PortfolioType) => {
    if (!optimizationResults) return;
    
    setPortfolioType(type);
    
    // Handle different portfolio types
    if (type === 'optimal') {
      setSelectedIndex(null);
    } else if (type === 'min-volatility') {
      // Find the minimum volatility portfolio
      const minVolIndex = optimizationResults.ef_results.volatilities.indexOf(
        Math.min(...optimizationResults.ef_results.volatilities)
      );
      setSelectedIndex(minVolIndex);
    } else if (type === 'target-returns') {
      setReturnsDialogOpen(true);
    } else if (type === 'target-volatility') {
      setVolatilityDialogOpen(true);
    }
  };
  
  // Handle target returns submission
  const handleTargetReturnsSubmit = () => {
    if (!optimizationResults || !targetReturns) return;
    
    const parsedTarget = parseFloat(targetReturns) / 100; // Convert from percentage
    const closestIndex = findClosestIndex(optimizationResults.ef_results.returns, parsedTarget);
    
    setSelectedIndex(closestIndex);
    setReturnsDialogOpen(false);
  };
  
  // Handle target volatility submission
  const handleTargetVolatilitySubmit = () => {
    if (!optimizationResults || !targetVolatility) return;
    
    const parsedTarget = parseFloat(targetVolatility) / 100; // Convert from percentage
    const closestIndex = findClosestIndex(optimizationResults.ef_results.volatilities, parsedTarget);
    
    setSelectedIndex(closestIndex);
    setVolatilityDialogOpen(false);
  };

  // Calculate current portfolio metrics based on selection
  const getCurrentPortfolioMetrics = () => {
    if (!optimizationResults) return null;
    
    if (portfolioType === 'optimal') {
      return {
        returns: optimizationResults.opt_returns,
        volatility: optimizationResults.opt_volatility,
        sharpeRatio: optimizationResults.opt_sharpe_ratio,
        weights: optimizationResults.opt_weights
      };
    }
    
    if (selectedIndex === null || selectedIndex < 0) return null;
    
    return {
      returns: optimizationResults.ef_results.returns[selectedIndex],
      volatility: optimizationResults.ef_results.volatilities[selectedIndex],
      sharpeRatio: optimizationResults.ef_results.sharpe_ratios[selectedIndex],
      weights: optimizationResults.ef_results.weights[selectedIndex]
    };
  };
  
  const currentPortfolio = getCurrentPortfolioMetrics();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Portfolio Optimization</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left column - Efficient Frontier */}
        <Card className="md:col-span-8 md:row-span-2 h-full">
          <CardHeader>
            <CardTitle>Efficient Frontier</CardTitle>
          </CardHeader>
          <CardContent className="h-[90%]">
            {optimizationResults?.ef_results?.efficient_frontier ? (
              <Plot 
                data={optimizationResults.ef_results.efficient_frontier.data}
                layout={{
                  ...optimizationResults.ef_results.efficient_frontier.layout,
                  autosize: true,
                  margin: { t: 10, r: 10, b: 50, l: 60 },
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{
                  responsive: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['resetScale2d', 'toImage', 'zoomIn2d', 'autoScale2d', 'select2d', 'lasso2d'],
                  logging: 0
                }}
              />
            ) : (
              <div className="h-full rounded-md flex items-center justify-center bg-slate-800">
                <p className="text-slate-400">Run optimization to see Efficient Frontier</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Right column top - Optimization Parameters */}
        <Card className="md:col-span-4">
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
        
        {/* Right column bottom - Portfolio Details */}
        <Card className="md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Optimal Portfolio</CardTitle>
            </div>
            
            <div className="w-40">
              <Select
                disabled={!optimizationResults}
                value={portfolioType}
                onValueChange={(value: PortfolioType) => handlePortfolioTypeChange(value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Portfolio Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optimal">Optimal Portfolio</SelectItem>
                  <SelectItem value="target-returns">Target Returns</SelectItem>
                  <SelectItem value="target-volatility">Target Volatility</SelectItem>
                  <SelectItem value="min-volatility">Min Volatility</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] overflow-hidden">
            {optimizationResults && currentPortfolio ? (
              <div className="flex flex-col h-full">
                {/* Portfolio Metrics */}
                <div className="space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Expected Returns</span>
                    <span className="text-green-500 font-semibold">
                      {(currentPortfolio.returns * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Expected Volatility</span>
                    <span className="text-red-500 font-semibold">
                      {(currentPortfolio.volatility * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Sharpe Ratio</span>
                    <span className="font-semibold">
                      {currentPortfolio.sharpeRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Weights Table */}
                <div className="flex-grow overflow-hidden flex flex-col">
                  <h4 className="text-sm font-medium mb-2 text-slate-400">Portfolio Weights</h4>
                  <div className="flex-grow overflow-y-auto">
                    <Table>
                      <TableBody>
                        {Object.entries(currentPortfolio.weights)
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
                
                {/* Button */}
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={handleRebalance}
                >
                  Rebalance Portfolio
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Run optimization to see results
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Target Returns Dialog */}
      <Dialog open={returnsDialogOpen} onOpenChange={setReturnsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Target Returns</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-returns" className="text-right">
                Target Returns (%)
              </Label>
              <Input
                id="target-returns"
                type="number"
                step="0.1"
                value={targetReturns}
                onChange={(e) => setTargetReturns(e.target.value)}
                placeholder="e.g. 12.5"
                className="col-span-3"
              />
            </div>
            {optimizationResults && (
              <div className="text-xs text-slate-400 mt-1">
                Available range: {(Math.min(...optimizationResults.ef_results.returns) * 100).toFixed(1)}% to{' '}
                {(Math.max(...optimizationResults.ef_results.returns) * 100).toFixed(1)}%
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReturnsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTargetReturnsSubmit}>Find Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Volatility Dialog */}
      <Dialog open={volatilityDialogOpen} onOpenChange={setVolatilityDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Target Volatility</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-volatility" className="text-right">
                Target Volatility (%)
              </Label>
              <Input
                id="target-volatility"
                type="number"
                step="0.1"
                value={targetVolatility}
                onChange={(e) => setTargetVolatility(e.target.value)}
                placeholder="e.g. 15.0"
                className="col-span-3"
              />
            </div>
            {optimizationResults && (
              <div className="text-xs text-slate-400 mt-1">
                Available range: {(Math.min(...optimizationResults.ef_results.volatilities) * 100).toFixed(1)}% to{' '}
                {(Math.max(...optimizationResults.ef_results.volatilities) * 100).toFixed(1)}%
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setVolatilityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTargetVolatilitySubmit}>Find Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OptimizeTab;