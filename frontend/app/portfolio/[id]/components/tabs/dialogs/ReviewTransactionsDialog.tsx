import React, { useState } from 'react';
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DefaultService, BaseTransaction } from '@/src/api';

interface ReviewTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  currency: string;
  transactions: BaseTransaction[];
  title?: string;
  description?: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

const ReviewTransactionsDialog = ({ 
  open, 
  onOpenChange, 
  portfolioId, 
  currency,
  transactions,
  title = "Review Transactions",
  description = "Review the following transactions before executing",
  onBack,
  onSuccess
}: ReviewTransactionsDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Execute transactions
  const executeTransactions = async () => {
    if (!transactions || transactions.length === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await DefaultService.parseTransactionsApiPortfolioPortfolioIdParseTransactionsPatch(
        portfolioId,
        { transactions }
      );
      
      setSuccessMessage('Transactions successfully executed');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Close dialog after a delay
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      console.error('Execute transactions error:', err);
      setError('Failed to execute transactions. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        {successMessage ? (
          <div className="py-10 text-center">
            <div className="text-green-500 text-lg mb-2">{successMessage}</div>
            <p className="text-slate-400">Closing dialog...</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  {transactions.map((t, i) => (
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
            
            {error && (
              <div className="text-red-500 text-sm p-2 rounded bg-red-500/10">
                {error}
              </div>
            )}
            
            <DialogFooter className="gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
              )}
              <Button onClick={executeTransactions} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  'Execute Transactions'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewTransactionsDialog;