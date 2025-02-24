// app/strategy/page.tsx
'use client';

import { useState, useEffect } from 'react';
import TickerInput from '@/app/assets/components/TickerInput';
import AssetChart from '@/components/AssetChart';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StrategyPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('5m');
  const [showVolume, setShowVolume] = useState(true);
  
  // Default start date for 5min data (15 days ago)
  const defaultFiveMinStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  
  // Separate date states for each timeframe
  const [fiveMinStartDate, setFiveMinStartDate] = useState<Date | undefined>(defaultFiveMinStart);
  const [fiveMinEndDate, setFiveMinEndDate] = useState<Date | undefined>(undefined);
  
  const [dailyStartDate, setDailyStartDate] = useState<Date | undefined>(undefined);
  const [dailyEndDate, setDailyEndDate] = useState<Date | undefined>(undefined);
  
  // Query strings for both timeframes
  const [fiveMinQueryString, setFiveMinQueryString] = useState('');
  const [dailyQueryString, setDailyQueryString] = useState('');
  
  // Flags to track if we need to refresh data
  const [fiveMinNeedsRefresh, setFiveMinNeedsRefresh] = useState(true);
  const [dailyNeedsRefresh, setDailyNeedsRefresh] = useState(true);
  
  // Update query strings when settings change for 5min
  useEffect(() => {
    const params = new URLSearchParams();
    params.append('timeframe', '5m');
    
    if (fiveMinStartDate) {
      params.append('start_date', format(fiveMinStartDate, 'yyyy-MM-dd'));
    }
    
    if (fiveMinEndDate) {
      params.append('end_date', format(fiveMinEndDate, 'yyyy-MM-dd'));
    }
    
    params.append('volume', showVolume.toString());
    
    setFiveMinQueryString(params.toString());
    setFiveMinNeedsRefresh(true);
  }, [fiveMinStartDate, fiveMinEndDate, showVolume]);
  
  // Update query strings when settings change for daily
  useEffect(() => {
    const params = new URLSearchParams();
    params.append('timeframe', '1d');
    
    if (dailyStartDate) {
      params.append('start_date', format(dailyStartDate, 'yyyy-MM-dd'));
    }
    
    if (dailyEndDate) {
      params.append('end_date', format(dailyEndDate, 'yyyy-MM-dd'));
    }
    
    params.append('volume', showVolume.toString());
    
    setDailyQueryString(params.toString());
    setDailyNeedsRefresh(true);
  }, [dailyStartDate, dailyEndDate, showVolume]);
  
  const handleAddTicker = (ticker: string) => {
    setSelectedAsset(ticker);
    setFiveMinNeedsRefresh(true);
    setDailyNeedsRefresh(true);
  };
  
  // Handle start date change based on active tab
  const handleStartDateChange = (date: Date | undefined) => {
    if (activeTab === '1d') {
      setDailyStartDate(date);
    } else {
      setFiveMinStartDate(date);
    }
  };
  
  // Handle end date change based on active tab
  const handleEndDateChange = (date: Date | undefined) => {
    if (activeTab === '1d') {
      setDailyEndDate(date);
    } else {
      setFiveMinEndDate(date);
    }
  };
  
  // Get the active dates based on the current tab
  const getActiveStartDate = () => {
    return activeTab === '1d' ? dailyStartDate : fiveMinStartDate;
  };
  
  const getActiveEndDate = () => {
    return activeTab === '1d' ? dailyEndDate : fiveMinEndDate;
  };
  
  // After chart is loaded, reset the refresh flag
  const handleFiveMinLoad = () => {
    setFiveMinNeedsRefresh(false);
  };
  
  const handleDailyLoad = () => {
    setDailyNeedsRefresh(false);
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
            
            {/* Second Column: Tabs & Volume */}
            <div className="flex items-center space-x-4">
              <Tabs 
                defaultValue="5m" 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value)}
                className="w-[200px]"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="5m">5-Min</TabsTrigger>
                  <TabsTrigger value="1d">Daily</TabsTrigger>
                </TabsList>
              </Tabs>
              
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
                      !getActiveStartDate() && "text-muted-foreground"
                    )}
                    size="sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {getActiveStartDate() ? format(getActiveStartDate()!, "dd-MM-yyyy") : <span>Start</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={getActiveStartDate()}
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
                      !getActiveEndDate() && "text-muted-foreground"
                    )}
                    size="sm"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {getActiveEndDate() ? format(getActiveEndDate()!, "dd-MM-yyyy") : <span>End</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={getActiveEndDate()}
                    onSelect={handleEndDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Chart Content */}
          <div className="h-[70vh]">
            <Tabs value={activeTab} className="h-full">
              <TabsContent value="5m" className="h-full">
                <AssetChart 
                  key={selectedAsset}
                  ticker={selectedAsset} 
                  plot_type="candlestick"
                  queryString={fiveMinQueryString}
                  skipFetch={!fiveMinNeedsRefresh}
                  onLoad={handleFiveMinLoad}
                />
              </TabsContent>
              <TabsContent value="1d" className="h-full">
                <AssetChart 
                  key={selectedAsset}
                  ticker={selectedAsset} 
                  plot_type="candlestick"
                  queryString={dailyQueryString}
                  skipFetch={!dailyNeedsRefresh}
                  onLoad={handleDailyLoad}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}