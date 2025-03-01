import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover-dialog';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DefaultService } from '@/src/api';

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  currency: string;
}

type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdraw';

const TransactionDialog = ({ open, onOpenChange, portfolioId, currency }: TransactionDialogProps) => {
  const [transactionType, setTransactionType] = useState<TransactionType>('buy');
  const [assetTicker, setAssetTicker] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<Date | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      switch (transactionType) {
        case 'buy':
          if (!assetTicker) {
            throw new Error('Asset ticker is required for buying');
          }
          
          // Format date if it exists
          const buyDate = transactionDate ? format(transactionDate, 'yyyy-MM-dd') : undefined;
          
          await DefaultService.buyApiPortfolioPortfolioIdBuyPatch(
            portfolioId,
            assetTicker,
            shares ? parseFloat(shares) : undefined,
            value ? parseFloat(value) : undefined,
            buyDate
          );
          break;
        
        case 'sell':
          if (!assetTicker) {
            throw new Error('Asset ticker is required for selling');
          }
          
          // Format date if it exists
          const sellDate = transactionDate ? format(transactionDate, 'yyyy-MM-dd') : undefined;
          
          await DefaultService.sellApiPortfolioPortfolioIdSellPatch(
            portfolioId,
            assetTicker,
            shares ? parseFloat(shares) : undefined,
            value ? parseFloat(value) : undefined,
            sellDate
          );
          break;
        
        case 'deposit':
          if (!value) {
            throw new Error('Value is required for deposits');
          }
          
          // Format date if it exists
          const depositDate = transactionDate ? format(transactionDate, 'yyyy-MM-dd') : undefined;
          
          await DefaultService.depositApiPortfolioPortfolioIdDepositPatch(
            portfolioId,
            parseFloat(value),
            undefined,  // currency
            depositDate
          );
          break;
        
        case 'withdraw':
          if (!value) {
            throw new Error('Value is required for withdrawals');
          }
          
          // Format date if it exists
          const withdrawDate = transactionDate ? format(transactionDate, 'yyyy-MM-dd') : undefined;
          
          await DefaultService.withdrawApiPortfolioPortfolioIdWithdrawPatch(
            portfolioId,
            parseFloat(value),
            undefined,  // currency
            withdrawDate
          );
          break;
      }

      // Success: Close dialog and reset form
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTransactionType('buy');
    setAssetTicker('');
    setValue('');
    setShares('');
    setTransactionDate(undefined);
    setError(null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make Transaction</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Transaction Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transaction-type" className="text-right">
              Type
            </Label>
            <Select 
              value={transactionType} 
              onValueChange={(value: TransactionType) => setTransactionType(value)}
            >
              <SelectTrigger className="col-span-3" id="transaction-type">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Asset Ticker - only for buy/sell */}
          {(transactionType === 'buy' || transactionType === 'sell') && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-ticker" className="text-right">
                Asset
              </Label>
              <Input
                id="asset-ticker"
                value={assetTicker}
                onChange={(e) => setAssetTicker(e.target.value)}
                placeholder="e.g. AAPL, MSFT"
                className="col-span-3"
              />
            </div>
          )}
          
          {/* Value (Optional for buy/sell, Required for deposit/withdraw) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Value
            </Label>
            <div className="col-span-3 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {currencySymbol}
              </span>
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>
          
          {/* Shares (Optional, only for buy/sell) */}
          {(transactionType === 'buy' || transactionType === 'sell') && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shares" className="text-right">
                Shares
              </Label>
              <Input
                id="shares"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.00"
                className="col-span-3"
              />
            </div>
          )}
          
          {/* Transaction Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transaction-date" className="text-right">
              Date
            </Label>
            <div className="col-span-3">
              <Popover 
                open={datePopoverOpen} 
                onOpenChange={setDatePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="transaction-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isSubmitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionDate ? format(transactionDate, 'MMM d, yyyy') : "Today (default)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transactionDate}
                    onSelect={(date) => {
                      setTransactionDate(date);
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Note */}
          <div className="text-xs text-slate-400 mt-2">
            {transactionType === 'buy' || transactionType === 'sell' 
              ? 'Specify either value or shares (not both) for market orders.'
              : `Enter the amount to ${transactionType} in ${currency}.`
            }
          </div>
          
          {/* Error message */}
          {error && (
            <div className="text-sm text-red-500 mt-2">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDialog;