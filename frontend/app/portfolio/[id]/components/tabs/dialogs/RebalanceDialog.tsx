import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { DefaultService, PortfolioTransactions_Output } from '@/src/api';

interface RebalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  currency: string;
  holdings: HoldingData[];
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

const RebalanceDialog = ({ 
  open, 
  onOpenChange, 
  portfolioId, 
  currency,
  holdings 
}: RebalanceDialogProps) => {
  // State for target weights
  const [targetWeights, setTargetWeights] = useState<Record<string, number>>({});
  const [validation, setValidation] = useState<{ error: string | null, isValid: boolean }>({
    error: null,
    isValid: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<PortfolioTransactions_Output | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize target weights when dialog opens or holdings change
  useEffect(() => {
    if (open && holdings.length > 0) {
      // Initialize with current weights
      const initialWeights: Record<string, number> = {};
      holdings.forEach(holding => {
        initialWeights[holding.asset] = Math.round(holding.weight * 1000) / 10; // Convert to percentage with 1 decimal
      });
      setTargetWeights(initialWeights);
      setValidation({ error: null, isValid: true });
      setTransactions(null);
      setSuccessMessage(null);
    }
  }, [open, holdings]);

  // Handle weight input change
  const handleWeightChange = (asset: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const newWeights = { ...targetWeights, [asset]: numValue };
    setTargetWeights(newWeights);
    validateWeights(newWeights);
  };

  // Validate that weights sum to 100%
  const validateWeights = (weights: Record<string, number>) => {
    const sum = Object.values(weights).reduce((acc, val) => acc + val, 0);
    const isValid = Math.abs(sum - 100) < 0.5; // Allow some small rounding error
    
    setValidation({
      isValid,
      error: isValid ? null : `Target weights sum to ${sum.toFixed(1)}%, must be 100%`
    });
    
    return isValid;
  };

  // Handle rebalance submission
  const handleRebalance = async () => {
    if (!validateWeights(targetWeights)) return;
    
    setIsSubmitting(true);
    setTransactions(null);
    setSuccessMessage(null);
    
    try {
      // Convert percentages back to decimals
      const decimalWeights: Record<string, number> = {};
      Object.entries(targetWeights).forEach(([asset, weight]) => {
        decimalWeights[asset] = weight / 100;
      });
      
      // Call rebalance API
      const result = await DefaultService.rebalanceApiPortfolioPortfolioIdRebalancePost(
        portfolioId,
        decimalWeights
      );
      
      setTransactions(result);
    } catch (error) {
      console.error('Rebalance error:', error);
      setValidation({
        isValid: false,
        error: 'Failed to calculate rebalance transactions'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute the rebalance by applying the transactions
  const executeRebalance = async () => {
    if (!transactions) return;
    
    setIsSubmitting(true);
    
    try {
      await DefaultService.parseTransactionsApiPortfolioPortfolioIdParseTransactionsPatch(
        portfolioId,
        { transactions: transactions.transactions }
      );
      
      setSuccessMessage('Portfolio successfully rebalanced');
      
      // Close dialog after a delay
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error('Execute rebalance error:', error);
      setValidation({
        isValid: false,
        error: 'Failed to execute rebalance transactions'
      });
    } finally {
      setIsSubmitting(false);
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
    };
    
    return currencies[currencyCode] || currencyCode;
  };
  
  const currencySymbol = getCurrencySymbol(currency);

  // Calculate total weight
  const totalWeight = Object.values(targetWeights).reduce((acc, val) => acc + val, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Rebalance Portfolio</DialogTitle>
          <DialogDescription>
            Adjust target weights to rebalance your portfolio
          </DialogDescription>
        </DialogHeader>
        
        {successMessage ? (
          <div className="py-10 text-center">
            <div className="text-green-500 text-lg mb-2">{successMessage}</div>
            <p className="text-slate-400">Closing dialog...</p>
          </div>
        ) : transactions ? (
          <div className="space-y-4">
            <div className="text-sm font-medium">Review Rebalance Transactions</div>
            
            <div className="overflow-y-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-950">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.transactions.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className={t.type === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                        {t.type}
                      </TableCell>
                      <TableCell>{t.asset}</TableCell>
                      <TableCell className="text-right">{Math.abs(t.shares).toFixed(4)}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{Math.abs(t.value).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setTransactions(null)}>
                Back to Weights
              </Button>
              <Button onClick={executeRebalance} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  'Execute Rebalance'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-y-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-950">
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Current Weight</TableHead>
                    <TableHead className="text-right">Target Weight</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings
                    .sort((a, b) => b.weight - a.weight)
                    .map((holding) => {
                      const currentWeight = (holding.weight * 100).toFixed(1);
                      const targetWeight = targetWeights[holding.asset] || 0;
                      const difference = targetWeight - parseFloat(currentWeight);
                      
                      return (
                        <TableRow key={holding.asset}>
                          <TableCell>{holding.asset}</TableCell>
                          <TableCell className="text-right">{currentWeight}%</TableCell>
                          <TableCell className="text-right">
                            <Input
                              value={targetWeight}
                              onChange={(e) => handleWeightChange(holding.asset, e.target.value)}
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-20 h-8 text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={
                              difference > 0 
                                ? 'text-green-500' 
                                : difference < 0 
                                  ? 'text-red-500' 
                                  : ''
                            }>
                              {difference > 0 ? '+' : ''}
                              {difference.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center p-2 border rounded-md bg-slate-900">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Total:</span>
                <span className={
                  Math.abs(totalWeight - 100) < 0.5
                    ? 'font-medium text-green-500'
                    : 'font-medium text-red-500'
                }>
                  {totalWeight.toFixed(1)}%
                </span>
              </div>
              
              {validation.error && (
                <div className="flex items-center text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validation.error}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRebalance} 
                disabled={!validation.isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate Rebalance'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RebalanceDialog;