// app/strategy/page.tsx
'use client';

import { useState, useEffect } from 'react';
import TickerInput from '@/app/assets/components/TickerInput';
import AssetChart from '@/components/AssetChart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StrategyPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isDaily, setIsDaily] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  
  // Default start date for 5min data (15 days ago)
  const defaultFiveMinStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  
  // Separate date states for each timeframe
  const [fiveMinStartDate, setFiveMinStartDate] = useState<Date | undefined>(defaultFiveMinStart);
  const [fiveMinEndDate, setFiveMinEndDate] = useState<Date | undefined>(undefined);
  
  const [dailyStartDate, setDailyStartDate] = useState<Date | undefined>(undefined);
  const [dailyEndDate, setDailyEndDate] = useState<Date | undefined>(undefined);
  
  // Active dates based on current timeframe
  const [activeStartDate, setActiveStartDate] = useState<Date | undefined>(defaultFiveMinStart);
  const [activeEndDate, setActiveEndDate] = useState<Date | undefined>(undefined);
  
  const [queryString, setQueryString] = useState('');
  
  // Update active dates when timeframe changes
  useEffect(() => {
    if (isDaily) {
      setActiveStartDate(dailyStartDate);
      setActiveEndDate(dailyEndDate);
    } else {
      setActiveStartDate(fiveMinStartDate);
      setActiveEndDate(fiveMinEndDate);
    }
  }, [isDaily, dailyStartDate, dailyEndDate, fiveMinStartDate, fiveMinEndDate]);
  
  // Handle date changes based on timeframe
  const handleStartDateChange = (date: Date | undefined) => {
    if (isDaily) {
      setDailyStartDate(date);
    } else {
      setFiveMinStartDate(date);
    }
    setActiveStartDate(date);
  };
  
  const handleEndDateChange = (date: Date | undefined) => {
    if (isDaily) {
      setDailyEndDate(date);
    } else {
      setFiveMinEndDate(date);
    }
    setActiveEndDate(date);
  };
  
  // Update query string when settings change
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Set timeframe based on switch
    params.append('timeframe', isDaily ? '1d' : '5m');
    
    // Add dates if defined
    if (activeStartDate) {
      params.append('start_date', format(activeStartDate, 'yyyy-MM-dd'));
    }
    
    if (activeEndDate) {
      params.append('end_date', format(activeEndDate, 'yyyy-MM-dd'));
    }
    
    // Add volume setting
    params.append('volume', showVolume.toString());
    
    setQueryString(params.toString());
  }, [isDaily, activeStartDate, activeEndDate, showVolume]);
  
  const handleAddTicker = (ticker: string) => {
    setSelectedAsset(ticker);
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl text-center font-bold mb-6">Strategy Builder</h1>
      
      {/* Asset Input */}
      <TickerInput onAddTicker={handleAddTicker} />
      
      {/* Chart Display with Settings Inside */}
      {selectedAsset && (
        <div className="border p-4 rounded-lg mt-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
            {/* First Column: Asset Title */}
            <h2 className="text-lg font-semibold">{selectedAsset}</h2>
            
            {/* Second Column: Timeframe Toggle & Volume */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="timeframe-switch" className={isDaily ? "opacity-50" : "font-medium"}>
                  5-Min
                </Label>
                <Switch
                  id="timeframe-switch"
                  checked={isDaily}
                  onCheckedChange={setIsDaily}
                />
                <Label htmlFor="timeframe-switch" className={!isDaily ? "opacity-50" : "font-medium"}>
                  Daily
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="volume"
                  checked={showVolume}
                  onCheckedChange={(checked) => setShowVolume(checked as boolean)}
                />
                <Label htmlFor="volume">Show Volume</Label>
              </div>
            </div>
            
            {/* Third Column: Date Range Controls */}
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !activeStartDate && "text-muted-foreground"
                    )}
                    size="sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {activeStartDate ? format(activeStartDate, "dd-MM-yyyy") : <span>Start</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={activeStartDate}
                    onSelect={handleStartDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <span className="font-bold">-</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !activeEndDate && "text-muted-foreground"
                    )}
                    size="sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {activeEndDate ? format(activeEndDate, "dd-MM-yyyy") : <span>End</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={activeEndDate}
                    onSelect={handleEndDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-[70vh]">
            <AssetChart 
              ticker={selectedAsset} 
              plot_type="candlestick"
              queryString={queryString}
            />
          </div>
        </div>
      )}
    </div>
  );
}