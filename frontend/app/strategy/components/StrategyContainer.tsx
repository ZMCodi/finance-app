// app/strategy/components/StrategyContainer.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChartControls from './ChartControls';
import ChartDisplay from './ChartDisplay';
import TickerInput from '@/app/assets/components/TickerInput';

export default function StrategyContainer() {
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
  
  // Active tab indicator
  const [activeSideTab, setActiveSideTab] = useState<string>('chart');
  
  // Technical indicators state
  const [showIndicators, setShowIndicators] = useState<boolean>(false);
  
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
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Handle volume change
  const handleVolumeChange = (show: boolean) => {
    setShowVolume(show);
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
          <div className="flex flex-col space-y-4">
            {/* Header with Ticker and View Toggle */}
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <Tabs 
                orientation="horizontal" 
                value={activeSideTab} 
                onValueChange={setActiveSideTab}
                className="w-auto"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="chart" className="text-xs px-3">Chart</TabsTrigger>
                  <TabsTrigger value="strategy" className="text-xs px-3">Strategy</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Asset Title */}
              <h2 className="text-lg font-semibold">{selectedAsset}</h2>
              
              {/* Chart Controls */}
              <div className="ml-auto">
                <ChartControls 
                  activeTab={activeTab}
                  showVolume={showVolume}
                  showIndicators={showIndicators}
                  startDate={getActiveStartDate()}
                  endDate={getActiveEndDate()}
                  onTabChange={handleTabChange}
                  onVolumeChange={handleVolumeChange}
                  onIndicatorsChange={setShowIndicators}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                />
              </div>
            </div>
            
            {/* Content Based on Selected Tab */}
            <Tabs value={activeSideTab} className="h-full w-full">
              <TabsContent value="chart" className="h-full mt-0 w-full">
                <ChartDisplay 
                  ticker={selectedAsset}
                  activeTab={activeTab}
                  showIndicators={showIndicators}
                  fiveMinQueryString={fiveMinQueryString}
                  dailyQueryString={dailyQueryString}
                  onFiveMinLoad={handleFiveMinLoad}
                  onDailyLoad={handleDailyLoad}
                  skipFiveMinFetch={!fiveMinNeedsRefresh}
                  skipDailyFetch={!dailyNeedsRefresh}
                />
              </TabsContent>
              
              <TabsContent value="strategy" className="h-full mt-0 w-full">
                <div className="h-[70vh] p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Strategy Builder</h3>
                  <p className="text-gray-500">Here youll be able to build and backtest your trading strategies.</p>
                  {/* Future strategy building interface will go here */}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}