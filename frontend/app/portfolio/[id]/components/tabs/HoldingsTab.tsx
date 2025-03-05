'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { HoldingsStats, PortfolioStats, HoldingsPlots, PlotJSON } from '@/src/api/index';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from 'next/dynamic';
import TransactionDialog from './dialogs/TransactionDialog';
import TransactionHistoryDialog from './dialogs/TransactionHistoryDialog';
import RebalanceDialog from './dialogs/RebalanceDialog';
import { useRouter } from 'next/navigation';

interface HoldingsTabProps {
  portfolioId: string;
  currency: string;
  portfolioData?: PortfolioStats | null;
  holdingsData?: HoldingsStats | null;
  plotData?: HoldingsPlots | null;
  onDataChange?: () => void;
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

const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <div className='h-full flex items-center justify-center'>Loading...</div>, 
});

const HoldingsTab = ({ portfolioId, currency, portfolioData, holdingsData, plotData, onDataChange }: HoldingsTabProps) => {
  const [holdings, setHoldings] = useState<HoldingData[]>([]);
  const [plots, setPlots] = useState<Record<string, PlotJSON | null | undefined> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [rebalanceDialogOpen, setRebalanceDialogOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const processHoldingsData = async () => {
      try {
        // If we have holdingsData and portfolioData from props, use them
        if (holdingsData && portfolioData && plotData) {
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

          const plotArray: Record<string, PlotJSON | null | undefined> = {
            holdings_pie: plotData.holdings_chart,
            asset_type_exposure: plotData.asset_type_exposure,
            sector_exposure: plotData.sector_exposure,
            correlation_heatmap: plotData.correlation_matrix
          }
          
          setHoldings(holdingsArray);
          setPlots(plotArray);
          return;
        }
    } catch (error) {
      console.error('Error processing holdings data:', error);
    } finally {
      setIsLoading(false);
    }
  };
    processHoldingsData();
  }, [portfolioId, holdingsData, portfolioData, plotData]);

  // Handlers for dialog data changes
  const handleTransactionSuccess = () => {
    // Close the dialog
    setTransactionDialogOpen(false);
    
    // Trigger data refresh
    if (onDataChange) {
      onDataChange();
    }
  };
  
  const handleRebalanceSuccess = () => {
    // Close the dialog
    setRebalanceDialogOpen(false);
    
    // Trigger data refresh
    if (onDataChange) {
      onDataChange();
    }
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTransactionDialogOpen(true)}>
              Add Transaction
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHistoryDialogOpen(true)}>
              Transaction History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRebalanceDialogOpen(true)}>
              Rebalance Portfolio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Holdings Chart */}
      <Card className='h-96'>
        <CardContent className='p-4 h-full'>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        <div className="h-full">
          {plots?.holdings_pie ? (
            <Plot
          data={plots.holdings_pie.data}
          layout={{
            ...plots.holdings_pie.layout,
            margin: { t: 0, b: 10, l: 0, r: 0 },
            autosize: true,
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
            <div className="h-full flex items-center justify-center">
          <p className="text-slate-400">Holdings chart not available</p>
            </div>
          )}
        </div>
        <div className="h-full">
          {plots?.asset_type_exposure ? (
            <Plot
          data={plots.asset_type_exposure.data}
          layout={{
            ...plots.asset_type_exposure.layout,
            margin: { t: 0, b: 10, l: 0, r: 0 },
            autosize: true,
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
            <div className="h-full flex items-center justify-center">
          <p className="text-slate-400">Asset type exposure not available</p>
            </div>
          )}
        </div>
        <div className="h-full">
          {plots?.sector_exposure ? (
            <Plot
          data={plots.sector_exposure.data}
          layout={{
            ...plots.sector_exposure.layout,
            margin: { t: 0, b: 10, l: 0, r: 0 },
            autosize: true,
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
            <div className="h-full flex items-center justify-center">
          <p className="text-slate-400">Sector exposure not available</p>
            </div>
          )}
        </div>
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
            <CardContent className="p-0 h-[85%]">
              {plots?.correlation_heatmap ? (
                <Plot
                  className='h-full'
                  data={plots.correlation_heatmap.data}
                  layout={{
                    ...plots.correlation_heatmap.layout,
                    margin: { t: 0 },
                    // autosize: true,
                  }}
                  config={{
                    responsive: true,
                    displaylogo: false,
                    displayModeBar: false,
                    logging: 0
                  }}
                />
              ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-400">No correlation matrix available</p>
              </div>
              )}
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
                    {currencySymbol}{portfolioData?.position.total_value.toFixed(2)}
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
                    {((portfolioData?.position?.largest_position ?? 0) * 100).toFixed(2)}% / {((portfolioData?.position?.smallest_position ?? 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Concentration</span>
                  <span className="font-semibold">
                    {((portfolioData?.position?.concentration ?? 0) * 100).toFixed(2)}%
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
                  <span className={`font-semibold ${(portfolioData?.activity?.realized_pnl ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(portfolioData?.activity?.realized_pnl ?? 0) >= 0 ? '+' : '-'}
                    {currencySymbol}{Math.abs(portfolioData?.activity?.realized_pnl || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Unrealized P&L</span>
                  <span className={`font-semibold ${(portfolioData?.activity?.unrealized_pnl ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(portfolioData?.activity?.unrealized_pnl ?? 0) >= 0 ? '+' : '-'}
                    {currencySymbol}{Math.abs(portfolioData?.activity?.unrealized_pnl ?? 0).toFixed(2)}
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
                      <TableRow key={index} className="hover:bg-slate-900 cursor-pointer" onClick={() => router.push(`/assets/${holding.asset}`)}>
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
      
      {/* Dialog Components */}
      <TransactionDialog 
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        portfolioId={portfolioId}
        currency={currency}
        onSuccess={handleTransactionSuccess}
      />
      
      <TransactionHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        portfolioId={portfolioId}
        currency={currency}
      />
      
      <RebalanceDialog
        open={rebalanceDialogOpen}
        onOpenChange={setRebalanceDialogOpen}
        portfolioId={portfolioId}
        currency={currency}
        holdings={holdings}
        onSuccess={handleRebalanceSuccess}
      />
    </div>
  );
};

export default HoldingsTab;