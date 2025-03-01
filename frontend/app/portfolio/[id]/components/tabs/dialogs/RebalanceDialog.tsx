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
import { AlertCircle, Loader2 } from "lucide-react";
import { DefaultService } from '@/src/api';
import ReviewTransactionsDialog from './ReviewTransactionsDialog';

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
  const [transactions, setTransactions] = useState<any[] | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

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
    const isValid = Math.abs(sum - 100) < 0.01; // Allow some small rounding error
    
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
      
      setTransactions(result.transactions);
      setReviewDialogOpen(true);
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

  // Handle successful rebalance
  const handleRebalanceSuccess = () => {
    // Close both dialogs after a successful rebalance
    setReviewDialogOpen(false);
    setTimeout(() => {
      onOpenChange(false);
    }, 500);
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
        
        {(
          <div className="space-y-4">
            <div className="overflow-y-auto max-h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-950 z-10">
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
                              className="w-20 h-8 text-center ml-auto"
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
            
            <div className="flex justify-between items-center p-2 border rounded-md">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Total:</span>
                <span className={
                  Math.abs(totalWeight - 100) < 0.01
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
      {/* Review Transactions Dialog */}
      {transactions && (
        <ReviewTransactionsDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          portfolioId={portfolioId}
          currency={currency}
          transactions={transactions}
          title="Review Rebalance Transactions"
          description="The following transactions will be executed to rebalance your portfolio"
          onBack={() => {
            setReviewDialogOpen(false);
            setTransactions(null);
          }}
          onSuccess={handleRebalanceSuccess}
        />
      )}
    </Dialog>
  );
};

export default RebalanceDialog;