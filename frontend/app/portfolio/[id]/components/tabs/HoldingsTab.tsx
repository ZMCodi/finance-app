'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DefaultService } from '@/src/api';
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

const HoldingsTab = ({ portfolioId, currency }: HoldingsTabProps) => {
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        setIsLoading(true);
        const holdingsStats = await DefaultService.holdingsStatsApiPortfolioPortfolioIdHoldingsStatsGet(
          portfolioId
        );
        
        // Convert the dictionary to an array for easier rendering
        const holdingsArray = Object.entries(holdingsStats).map(([ticker, metrics]) => ({
          asset: ticker,
          shares: metrics.shares,
          weight: metrics.weight,
          pnl: metrics.pnl,
          returns: metrics.returns,
          value: metrics.value,
          cost_basis: metrics.cost_basis,
          deposited: metrics.deposited
        }));
        
        setHoldings(holdingsArray);
      } catch (error) {
        console.error('Error fetching holdings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHoldings();
  }, [portfolioId]);

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
      
      {/* Holdings Chart Placeholder */}
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
      
      {/* Holdings Table */}
      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[350px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-950 z-10">
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Returns</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding, index) => (
                    <TableRow key={index} className="hover:bg-slate-800">
                      <TableCell className="font-medium">{holding.asset}</TableCell>
                      <TableCell className="text-right">{holding.shares.toFixed(5)}</TableCell>
                      <TableCell className="text-right">{(holding.weight * 100).toFixed(2)}%</TableCell>
                      <TableCell 
                        className={`text-right ${holding.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {holding.pnl >= 0 ? '+' : '-'}
                        {currencySymbol}{Math.abs(holding.pnl).toFixed(2)}
                      </TableCell>
                      <TableCell 
                        className={`text-right ${holding.returns >= 0 ? 'text-green-500' : 'text-red-500'}`}
                      >
                        {holding.returns >= 0 ? '+' : ''}
                        {(holding.returns * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">{currencySymbol}{holding.value.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{holding.cost_basis.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HoldingsTab;