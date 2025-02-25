// app/strategy/components/StrategyContainer.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ChartControls from './ChartControls';
import ChartDisplay from './ChartDisplay';
import TickerInput from '@/app/assets/components/TickerInput';
import { IndicatorType, strategyNameMap } from './IndicatorPanel';
import { StrategyCreate, StrategyPlot, PlotJSON } from '@/src/api/index';

// Cache for indicator plot data
const indicatorPlotCache: Record<string, PlotJSON> = {};

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
  
  // Strategy states
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>([]);
  const [strategies, setStrategies] = useState<Record<IndicatorType, string>>({});  // Indicator type -> strategy_id
  const [indicatorPlots, setIndicatorPlots] = useState<Record<string, PlotJSON>>({});  // Strategy ID -> Plot data
  
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
    
    // Also clear indicator plot cache when query parameters change
    clearIndicatorPlotCache();
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
    
    // Also clear indicator plot cache when query parameters change
    clearIndicatorPlotCache();
  }, [dailyStartDate, dailyEndDate, showVolume]);
  
  // Update indicator plots when needed
  useEffect(() => {
    if (activeIndicators.length > 0) {
      updateIndicatorPlots();
    }
  }, [activeTab, fiveMinNeedsRefresh, dailyNeedsRefresh]);
  
  // Function to create a new strategy
  const createStrategy = async (ticker: string, strategyName: string): Promise<string> => {
    try {
      const response = await fetch(`http://localhost:8000/api/strategies/${ticker}/${strategyName}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create strategy: ${response.statusText}`);
      }
      
      const data: StrategyCreate = await response.json();
      return data.strategy_id;
    } catch (error) {
      console.error("Error creating strategy:", error);
      throw error;
    }
  };
  
  // Function to get indicator plot data
  const getIndicatorPlot = async (strategyId: string, queryParams: string): Promise<PlotJSON> => {
    try {
      const response = await fetch(`http://localhost:8000/api/strategies/${strategyId}/indicator?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch indicator plot: ${response.statusText}`);
      }
      
      const data: StrategyPlot = await response.json();
      return data.json_data;
    } catch (error) {
      console.error("Error fetching indicator plot:", error);
      throw error;
    }
  };
  
  // Function to clear indicator plot cache
  const clearIndicatorPlotCache = () => {
    // Clear all cache entries
    Object.keys(indicatorPlotCache).forEach(key => {
      delete indicatorPlotCache[key];
    });
    
    // Force update of indicator plots
    if (activeIndicators.length > 0) {
      updateIndicatorPlots();
    }
  };
  
  // Function to update all indicator plots
  const updateIndicatorPlots = async () => {
    // Skip if no strategies or no selected asset
    if (Object.keys(strategies).length === 0 || !selectedAsset) return;
    
    // Build query params based on current tab
    const params = new URLSearchParams();
    params.append('timeframe', activeTab === '5m' ? '5m' : '1d');
    
    if (activeTab === '5m' && fiveMinStartDate) {
      params.append('start_date', format(fiveMinStartDate, 'yyyy-MM-dd'));
    } else if (activeTab === '1d' && dailyStartDate) {
      params.append('start_date', format(dailyStartDate, 'yyyy-MM-dd'));
    }
    
    if (activeTab === '5m' && fiveMinEndDate) {
      params.append('end_date', format(fiveMinEndDate, 'yyyy-MM-dd'));
    } else if (activeTab === '1d' && dailyEndDate) {
      params.append('end_date', format(dailyEndDate, 'yyyy-MM-dd'));
    }
    
    const queryString = params.toString();
    
    // Update each strategy plot
    const updatedPlots: Record<string, PlotJSON> = {};
    const strategyFetches = Object.entries(strategies).map(async ([indicator, strategyId]) => {
      try {
        // Create a cache key
        const cacheKey = `${strategyId}-${activeTab}-${queryString}`;
        
        // Check if we have this in cache
        if (indicatorPlotCache[cacheKey]) {
          updatedPlots[strategyId] = indicatorPlotCache[cacheKey];
        } else {
          // Fetch new data
          const plotData = await getIndicatorPlot(strategyId, queryString);
          indicatorPlotCache[cacheKey] = plotData;
          updatedPlots[strategyId] = plotData;
        }
      } catch (error) {
        console.error(`Error updating plot for ${indicator}:`, error);
      }
    });
    
    // Wait for all fetches to complete
    await Promise.all(strategyFetches);
    
    // Update state with new plots
    setIndicatorPlots(updatedPlots);
  };
  
  const handleAddTicker = (ticker: string) => {
    setSelectedAsset(ticker);
    setFiveMinNeedsRefresh(true);
    setDailyNeedsRefresh(true);
    
    // Clear any existing strategies when changing tickers
    setActiveIndicators([]);
    setStrategies({});
    setIndicatorPlots({});
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Handle volume change
  const handleVolumeChange = (show: boolean) => {
    setShowVolume(show);
  };
  
  // Handle indicator selection
  const handleSelectIndicator = async (indicator: IndicatorType) => {
    if (!selectedAsset || activeIndicators.includes(indicator)) return;
    
    try {
      // Create the strategy
      const strategyId = await createStrategy(selectedAsset, strategyNameMap[indicator]);
      
      // Update strategies map
      const updatedStrategies = {
        ...strategies,
        [indicator]: strategyId
      };
      
      setStrategies(updatedStrategies);
      
      // Add to active indicators
      setActiveIndicators([...activeIndicators, indicator]);
      
      // Fetch indicator plot data for current state
      const params = new URLSearchParams();
      params.append('timeframe', activeTab === '5m' ? '5m' : '1d');
      
      if (activeTab === '5m' && fiveMinStartDate) {
        params.append('start_date', format(fiveMinStartDate, 'yyyy-MM-dd'));
      } else if (activeTab === '1d' && dailyStartDate) {
        params.append('start_date', format(dailyStartDate, 'yyyy-MM-dd'));
      }
      
      if (activeTab === '5m' && fiveMinEndDate) {
        params.append('end_date', format(fiveMinEndDate, 'yyyy-MM-dd'));
      } else if (activeTab === '1d' && dailyEndDate) {
        params.append('end_date', format(dailyEndDate, 'yyyy-MM-dd'));
      }
      
      const queryString = params.toString();
      const cacheKey = `${strategyId}-${activeTab}-${queryString}`;
      
      // Fetch plot data
      const plotData = await getIndicatorPlot(strategyId, queryString);
      
      // Store in cache
      indicatorPlotCache[cacheKey] = plotData;
      
      // Update state with new plot
      setIndicatorPlots({
        ...indicatorPlots,
        [strategyId]: plotData
      });
      
      // Trigger data refresh for the main chart
      if (activeTab === '5m') {
        setFiveMinNeedsRefresh(true);
      } else {
        setDailyNeedsRefresh(true);
      }
    } catch (error) {
      console.error("Error adding indicator:", error);
    }
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

  const handleRemoveIndicator = (indicator: IndicatorType) => {
    // Remove from active indicators
    const updatedIndicators = activeIndicators.filter(i => i !== indicator);
    setActiveIndicators(updatedIndicators);
    
    // Get strategy ID for this indicator
    const strategyId = strategies[indicator];
    if (!strategyId) return;
    
    // Remove from strategies object
    const updatedStrategies = { ...strategies };
    delete updatedStrategies[indicator];
    setStrategies(updatedStrategies);
    
    // Remove from indicator plots
    const updatedPlots = { ...indicatorPlots };
    delete updatedPlots[strategyId];
    setIndicatorPlots(updatedPlots);
    
    // Note: In a real implementation, you might want to call an API to delete the strategy
  };
  
  // Handler for configuring an indicator
  const handleConfigureIndicator = (indicator: IndicatorType) => {
    // For now, just log the action - you'll implement the actual configuration later
    console.log(`Configure ${indicator}`);
  };
  
  // Handler for optimizing an indicator
  const handleOptimizeIndicator = (indicator: IndicatorType) => {
    // For now, just log the action - you'll implement the actual optimization later
    console.log(`Optimize ${indicator}`);
  };
  
  // Handler for generating signal
  const handleGenerateSignal = (indicator: IndicatorType) => {
    // For now, just log the action - you'll implement the signal generation later
    console.log(`Generate signal for ${indicator}`);
  };
  
  // Handler for adding to strategy
  const handleAddToStrategy = (indicator: IndicatorType) => {
    // For now, just log the action - you'll implement adding to strategy later
    console.log(`Add ${indicator} to strategy`);
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
                activeIndicators={activeIndicators}
                startDate={getActiveStartDate()}
                endDate={getActiveEndDate()}
                onTabChange={handleTabChange}
                onVolumeChange={handleVolumeChange}
                onSelectIndicator={handleSelectIndicator}
                onRemoveIndicator={handleRemoveIndicator}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onConfigureIndicator={handleConfigureIndicator}
                onOptimizeIndicator={handleOptimizeIndicator}
                onGenerateSignal={handleGenerateSignal}
                onAddToStrategy={handleAddToStrategy}
              />
              </div>
            </div>
            
            {/* Content Based on Selected Tab */}
            <Tabs value={activeSideTab} className="h-full w-full">
              <TabsContent value="chart" className="h-full mt-0 w-full">
                <ChartDisplay 
                  ticker={selectedAsset}
                  activeTab={activeTab}
                  showIndicators={activeIndicators.length > 0}
                  fiveMinQueryString={fiveMinQueryString}
                  dailyQueryString={dailyQueryString}
                  onFiveMinLoad={handleFiveMinLoad}
                  onDailyLoad={handleDailyLoad}
                  skipFiveMinFetch={!fiveMinNeedsRefresh}
                  skipDailyFetch={!dailyNeedsRefresh}
                  activeIndicators={activeIndicators}
                  indicatorPlots={indicatorPlots}
                  strategies={strategies}
                />
              </TabsContent>
              
              <TabsContent value="strategy" className="h-full mt-0 w-full">
                <div className="h-[70vh] p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Strategy Builder</h3>
                  <p className="text-gray-500">Here you'll be able to build and backtest your trading strategies.</p>
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