'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DefaultService } from '@/src/api';
import { HoldingsStats, PortfolioStats } from '@/src/api/models';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HoldingsTabProps {
  portfolioId: string;
  currency: string;
  portfolioData?: PortfolioStats | null;
  holdingsData?: HoldingsStats | null;
}

interface HoldingData {
  asset: string;
  shares: number;
  weight: number;
  pnl: number;
  returns: number;
  value: number;
  cost_basis: number;
  deposited: number;
}

const HoldingsTab = ({ portfolioId, currency, portfolioData, holdingsData }: HoldingsTabProps) => {
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);

  useEffect(() => {
    const processHoldingsData = async () => {
      try {
        // If we have holdingsData and portfolioData from props, use them
        if (holdingsData && portfolioData) {
          // Convert the dictionary to an array for easier rendering
          const holdingsArray = Object.entries(holdingsData).map(([ticker, metrics]) => ({
            asset: ticker,
            shares: metrics.shares,
            weight: metrics.weight,
            pnl: metrics.pnl,
            returns: metrics.returns,
            value: metrics.value,
            cost_basis: metrics.cost_basis,
            deposited: metrics.deposited
          }));
          
          // Calculate totals
          const totalVal = holdingsArray.reduce((sum, holding) => sum + holding.value, 0);
          const totalProfitLoss = holdingsArray.reduce((sum, holding) => sum + holding.pnl, 0);
          
          setTotalValue(totalVal);
          setTotalPnL(totalProfitLoss);
          setHoldings(holdingsArray);
          return;
        }
        
        // Fallback to fetching data if it wasn't provided
        setIsLoading(true);
        
        // Fetch holdings data
        const fetchedHoldingsStats = await DefaultService.holdingsStatsApiPortfolioPortfolioIdHoldingsStatsGet(
          portfolioId
        );
        
        // Fetch portfolio stats for position and activity metrics
        const fetchedStats = await DefaultService.portfolioStatsApiPortfolioPortfolioIdStatsGet(
          portfolioId
        );
        
        // Convert the dictionary to an array for easier rendering
        const holdingsArray = Object.entries(fetchedHoldingsStats).map(([ticker, metrics]) => ({
          asset: ticker,
          shares: metrics.shares,
          weight: metrics.weight,
          pnl: metrics.pnl,
          returns: metrics.returns,
          value: metrics.value,
          cost_basis: metrics.cost_basis,
          deposited: metrics.deposited
        }));
        
        // Calculate totals
        const totalVal = holdingsArray.reduce((sum, holding) => sum + holding.value, 0);
        const totalProfitLoss = holdingsArray.reduce((sum, holding) => sum + holding.pnl, 0);
        
        setTotalValue(totalVal);
        setTotalPnL(totalProfitLoss);
        setHoldings(holdingsArray);
      } catch (error) {
        console.error('Error processing holdings data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    processHoldingsData();
  }, [portfolioId, holdingsData, portfolioData]);

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
        <p className="text-slate-400">Loading holdings data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Portfolio Holdings</h2>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Position
        </Button>
      </div>
      
      {/* Holdings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-800 h-64 rounded-md flex items-center justify-center">
            <p className="text-slate-400">Holdings Pie Chart will appear here</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Two-column layout for positions and stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-2">
          <Card className='h-full'>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Correlation Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="bg-slate-800 rounded-md flex items-center justify-center h-[450px]">
              <p className="text-slate-400">Correlation Heatmap will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Left column - Portfolio Stats */}
        <div className="space-y-4">
          {/* Position Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Position Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Value</span>
                  <span className="font-semibold">
                    {currencySymbol}{totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cash</span>
                  <span className="font-semibold">
                    {currencySymbol}{portfolioData?.position?.cash.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Positions</span>
                  <span className="font-semibold">
                    {portfolioData?.position?.number_of_positions || holdings.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Largest/Smallest</span>
                  <span className="font-semibold">
                    {(portfolioData?.position?.largest_position * 100 || 0).toFixed(2)}% / {(portfolioData?.position?.smallest_position * 100 || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Concentration</span>
                  <span className="font-semibold">
                    {portfolioData?.position?.concentration.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Activity Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Realized P&L</span>
                  <span className={`font-semibold ${portfolioData?.activity?.realized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {portfolioData?.activity?.realized_pnl >= 0 ? '+' : ''}
                    {currencySymbol}{(portfolioData?.activity?.realized_pnl || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Unrealized P&L</span>
                  <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {totalPnL >= 0 ? '+' : ''}
                    {currencySymbol}{totalPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Deposits</span>
                  <span className="font-semibold">
                    {currencySymbol}{(portfolioData?.activity?.net_deposits || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Number of Trades</span>
                  <span className="font-semibold">
                    {portfolioData?.activity?.number_of_trades || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-semibold">
                    {((portfolioData?.activity?.win_rate || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Profit Factor</span>
                  <span className="font-semibold">
                    {(portfolioData?.activity?.profit_factor || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Holdings Table */}
            <div className="rounded-md border border-slate-800">
              <div className="max-h-[550px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-950">
                    <TableRow>
                      <TableHead className="py-2">Asset</TableHead>
                      <TableHead className="text-right py-2">Value</TableHead>
                      <TableHead className="text-right py-2">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {holdings
                      .sort((a, b) => b.weight - a.weight)
                      .map((holding, index) => (
                      <TableRow key={index} className="hover:bg-slate-900 cursor-pointer" onClick={() => console.log(`Details for ${holding.asset}`)}>
                      <TableCell className="py-2">
                        <div>
                        <div className="font-medium">{holding.asset}</div>
                        <div className="text-xs text-slate-400">{holding.shares.toFixed(5)} shares</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="font-medium">{currencySymbol}{holding.value.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">{(holding.weight * 100).toFixed(2)}%</div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className={`font-medium ${holding.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {holding.pnl >= 0 ? '+' : '-'}
                        {currencySymbol}{Math.abs(holding.pnl).toFixed(2)}
                        </div>
                        <div className={`text-xs ${holding.returns >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {holding.returns >= 0 ? '+' : ''}
                        {(holding.returns * 100).toFixed(2)}%
                        </div>
                      </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </div>
            </div>
      </div>
    </div>
  );
};

export default HoldingsTab;