import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { DefaultService, PortfolioTransactions_Output, BaseTransaction } from '@/src/api';

interface TransactionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  currency: string;
}

type TransactionFilter = 'all' | 'buy' | 'sell' | 'deposit' | 'withdraw';

const TransactionHistoryDialog = ({ 
  open, 
  onOpenChange, 
  portfolioId, 
  currency 
}: TransactionHistoryDialogProps) => {
  const [transactions, setTransactions] = useState<BaseTransaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, portfolioId]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await DefaultService.portfolioTransactionsApiPortfolioPortfolioIdTransactionsGet(portfolioId);
      if (result && result.transactions) {
        setTransactions(result.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter transactions based on selected type
  const filteredTransactions = transactions.filter(t => 
    filter === 'all' || t.type.toLowerCase() === filter.toLowerCase()
  );

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
    };
    
    return currencies[currencyCode] || currencyCode;
  };
  
  const currencySymbol = getCurrencySymbol(currency);

  // Helper to format transaction type for display
  const getTransactionBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      'BUY': 'bg-emerald-500',
      'SELL': 'bg-red-500',
      'DEPOSIT': 'bg-blue-500',
      'WITHDRAW': 'bg-amber-500'
    };
    
    return (
      <Badge className={`${typeColors[type] || 'bg-gray-500'}`}>
        {type}
      </Badge>
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
          <DialogDescription>
            View all transactions for your portfolio
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-slate-400">
            {filteredTransactions.length} transactions
          </div>
          
          <div className="w-48">
            <Select 
              value={filter} 
              onValueChange={(value: TransactionFilter) => setFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[500px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-950">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        {getTransactionBadge(transaction.type)}
                      </TableCell>
                      <TableCell>
                        {transaction.asset}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.shares.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol}{transaction.value.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.type === 'SELL' ? (
                          <span className={transaction.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {transaction.profit >= 0 ? '+' : '-'}
                            {currencySymbol}{Math.abs(Number(transaction.profit.toFixed(2)))}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionHistoryDialog;