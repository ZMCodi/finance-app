// app/strategy/components/dialogs/BacktestDialog.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BacktestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBacktest: (startDate?: Date, endDate?: Date) => Promise<void>;
  currentTimeframe: string;
  currentStartDate?: Date;
  currentEndDate?: Date;
}

export default function BacktestDialog({
  open,
  onOpenChange,
  onBacktest,
  currentTimeframe,
  currentStartDate,
  currentEndDate
}: BacktestDialogProps) {
  // Initialize state with current values
  const [startDate, setStartDate] = useState<Date | undefined>(currentStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(currentEndDate);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setStartDate(currentStartDate);
      setEndDate(currentEndDate);
      setIsLoading(false);
    }
  }, [open, currentStartDate, currentEndDate]);

  const handleBacktest = async () => {
    setIsLoading(true);
    try {
      await onBacktest(startDate, endDate);
      onOpenChange(false);
    } catch (error) {
      console.error('Error during backtest:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Backtest Settings</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Start Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-date" className="text-right">
              Start Date
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* End Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-date" className="text-right">
              End Date
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => 
                      startDate ? date < startDate : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleBacktest} 
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Run Backtest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}