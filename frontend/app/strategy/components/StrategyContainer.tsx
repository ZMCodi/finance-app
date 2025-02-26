// app/strategy/components/StrategyContainer.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ChartControls from './ChartControls';
import ChartDisplay from './ChartDisplay';
import TickerInput from '@/app/assets/components/TickerInput';
import { IndicatorType, strategyNameMap } from './IndicatorPanel';
import { StrategyCreate, StrategyPlot, PlotJSON } from '@/src/api/index';
import useStrategyOperations from '../hooks/useStrategyOperations';
import StrategyConfigDialog from './StrategyConfigDialog';

export default function StrategyContainer() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('5m');
  const [showVolume, setShowVolume] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeConfigIndicator, setActiveConfigIndicator] = useState<IndicatorType | null>(null);
  
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
  
  // Use our custom hook for strategy operations
  const { 
    state: strategyState, 
    operationState, 
    results,
    actions 
  } = useStrategyOperations();

  // Destructure strategy state for easier access
  const { activeIndicators, strategies, indicatorPlots } = strategyState;
  
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
    actions.clearPlotCache();
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
    actions.clearPlotCache();
  }, [dailyStartDate, dailyEndDate, showVolume]);
  
  // Update indicator plots when needed
  useEffect(() => {
    if (activeIndicators.length > 0) {
      const currentTimeframe = activeTab === '5m' ? '5m' : '1d';
      const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
      const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
      
      actions.updateIndicatorPlots(currentTimeframe, startDate, endDate);
    }
  }, [activeTab, fiveMinNeedsRefresh, dailyNeedsRefresh, activeIndicators]);
  
  // Handle adding a ticker
  const handleAddTicker = (ticker: string) => {
    setSelectedAsset(ticker);
    setFiveMinNeedsRefresh(true);
    setDailyNeedsRefresh(true);
    
    // Reset strategy state when changing tickers
    // Since we don't have a reset method in the hook, we'll just clear everything manually
    activeIndicators.forEach(indicator => {
      actions.removeIndicator(indicator);
    });
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
      await actions.createStrategy(selectedAsset, indicator);
      
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

  // Handler for removing an indicator
  const handleRemoveIndicator = (indicator: IndicatorType) => {
    actions.removeIndicator(indicator);
  };
  
  // Handler for configuring an indicator
  const handleConfigureIndicator = async (indicator: IndicatorType) => {
    console.log(`Configure ${indicator}`);
    setActiveConfigIndicator(indicator);
    setConfigDialogOpen(true);
  };

  // Add this handler function for saving configuration
  const handleSaveConfig = async (indicator: IndicatorType, params: Record<string, any>) => {
    try {
      const result = await actions.configureIndicator(indicator, params);
      console.log('Configuration result:', result);
      
      // Refresh charts after configuration
      if (activeTab === '5m') {
        setFiveMinNeedsRefresh(true);
      } else {
        setDailyNeedsRefresh(true);
      }
    } catch (error) {
      console.error(`Error configuring ${indicator}:`, error);
      throw error; // Rethrow to be handled in the dialog
    }
  };
  

  const handleOptimizeParamsInDialog = async (indicator: IndicatorType) => {
    try {
      console.log(`Optimizing parameters for ${indicator} in dialog`);
      
      const timeframe = activeTab === '5m' ? '5m' : '1d';
      const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
      const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
      
      const result = await actions.optimizeIndicator(
        indicator,
        timeframe,
        startDate,
        endDate
      );
      
      console.log('Optimization API result:', result);
      
      // Return the result directly - it should already contain a params object
      // based on the API response you shared
      return result;
    } catch (error) {
      console.error(`Error optimizing ${indicator} parameters:`, error);
      throw error;
    }
  };

  const handleOptimizeWeightsInDialog = async (indicator: IndicatorType) => {
    try {
      console.log(`Optimizing weights for ${indicator} in dialog`);
      
      const timeframe = activeTab === '5m' ? '5m' : '1d';
      const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
      const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
      
      const strategyId = strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      // Call the API through strategyOperations if possible
      const response = await fetch(
        `http://localhost:8000/api/strategies/${strategyId}/optimize/weights?timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to optimize weights: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Weight optimization API result:', data);
      
      // Return the data in the expected format
      return data; // Should contain a params object with weights
    } catch (error) {
      console.error(`Error optimizing ${indicator} weights:`, error);
      throw error;
    }
  };
  
  
  // Handler for generating signal
  const handleGenerateSignal = async (indicator: IndicatorType) => {
    console.log(`Generate signal for ${indicator}`);
    
    try {
      const currentTimeframe = activeTab === '5m' ? '5m' : '1d';
      const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
      const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
      
      const result = await actions.generateSignal(
        indicator,
        currentTimeframe,
        startDate,
        endDate
      );
      
      console.log('Signal generation result:', result);
      
      // Here you would typically visualize the signals on the chart
      // or show them in a table/panel
      
    } catch (error) {
      console.error(`Error generating signals for ${indicator}:`, error);
    }
  };
  
  // Handler for adding to strategy
  const handleAddToStrategy = async (indicator: IndicatorType) => {
    console.log(`Add ${indicator} to strategy`);
    
    try {
      // Default weight is 1.0
      const result = await actions.addToStrategy(indicator);
      console.log('Add to strategy result:', result);
      
      // Here you would typically update the UI to show the strategy composition
      // or navigate to the strategy view
      if (activeSideTab !== 'strategy') {
        setActiveSideTab('strategy');
      }
      
    } catch (error) {
      console.error(`Error adding ${indicator} to strategy:`, error);
    }
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
                onGenerateSignal={handleGenerateSignal}
                onAddToStrategy={handleAddToStrategy}
                isLoading={
                  operationState.configure.isLoading || 
                  operationState.optimize.isLoading || 
                  operationState.generateSignal.isLoading || 
                  operationState.addToStrategy.isLoading
                }
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
                  
                  {strategyState.combinedStrategyId ? (
                    <div className="space-y-4">
                      <p className="text-sm">
                        Combined Strategy ID: <span className="font-mono">{strategyState.combinedStrategyId}</span>
                      </p>
                      
                      <div className="border p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Strategy Components</h4>
                        <ul className="space-y-2">
                          {activeIndicators.map(indicator => (
                            <li key={indicator} className="flex items-center justify-between">
                              <span>{indicator}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          onClick={() => {
                            if (!selectedAsset) return;
                            const timeframe = activeTab === '5m' ? '5m' : '1d';
                            const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
                            const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
                            
                            // We need to backtest the combined strategy
                            if (strategyState.combinedStrategyId) {
                              // Need to implement this
                              console.log('Backtest combined strategy');
                            }
                          }}
                        >
                          Backtest
                        </button>
                        
                        <button 
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          onClick={() => {
                            if (!selectedAsset) return;
                            const timeframe = activeTab === '5m' ? '5m' : '1d';
                            const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
                            const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
                            
                            // Optimize weights
                            if (strategyState.combinedStrategyId) {
                              actions.optimizeStrategyWeights(
                                timeframe,
                                startDate,
                                endDate
                              ).then(result => {
                                console.log('Weight optimization result:', result);
                                // Update the UI with the optimized weights
                              }).catch(error => {
                                console.error('Error optimizing weights:', error);
                              });
                            }
                          }}
                        >
                          Optimize Weights
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500 mb-4">Add indicators to your strategy using the "Add to Strategy" option</p>
                      <button 
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                        disabled={activeIndicators.length === 0}
                        onClick={() => {
                          if (activeIndicators.length > 0) {
                            handleAddToStrategy(activeIndicators[0]);
                          }
                        }}
                      >
                        Add First Indicator to Strategy
                      </button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
      <StrategyConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        indicator={activeConfigIndicator}
        strategyId={activeConfigIndicator ? strategies[activeConfigIndicator] : null}
        onConfigSave={handleSaveConfig}
        onOptimizeParams={handleOptimizeParamsInDialog}
        onOptimizeWeights={handleOptimizeWeightsInDialog}
      />
    </div>
  );
}