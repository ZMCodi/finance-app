// app/strategy/components/StrategyContainer.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronDown, Settings, RefreshCw, LineChart, FolderPlus, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import ChartControls from './ChartControls';
import ChartDisplay from './ChartDisplay';
import TickerInput from '@/app/assets/components/TickerInput';
import { IndicatorType, strategyNameMap } from './IndicatorPanel';
import { StrategyCreate, StrategyPlot, PlotJSON } from '@/src/api/index';
import useStrategyOperations from '../hooks/useStrategyOperations';
import StrategyConfigDialog from './StrategyConfigDialog';
import CombinedStrategyIndicatorRow from './CombinedStrategyIndicatorRow';

export default function StrategyContainer() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('5m');
  const [showVolume, setShowVolume] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeConfigIndicator, setActiveConfigIndicator] = useState<IndicatorType | null>(null);
  const [activeConfigStrategyId, setActiveConfigStrategyId] = useState<string | null>(null);
  
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

  // buy/sell signal data
  const [signalData, setSignalData] = useState<Record<IndicatorType, any>>({});
  
  // Use our custom hook for strategy operations
  const { 
    state: strategyState, 
    operationState, 
    results,
    actions 
  } = useStrategyOperations();

  // Destructure strategy state for easier access
  const { activeIndicators, strategies, indicatorPlots, combinedStrategyIndicators } = strategyState;
  
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

    // Also clear the signal data for this indicator from local state
    setSignalData(prev => {
      const updated = { ...prev };
      delete updated[indicator];
      return updated;
    });
  };
  
  // Handler for configuring an indicator
  const handleConfigureIndicator = async (indicator: IndicatorType) => {
    console.log(`Configure ${indicator}`);
    setActiveConfigIndicator(indicator);
    setActiveConfigStrategyId(strategies[indicator]);
    setConfigDialogOpen(true);
  };

  // Handler for configuring a combined strategy indicator
  const handleConfigureCombinedIndicator = (indicatorType: IndicatorType, strategyId: string) => {
    console.log(`Configure combined strategy indicator ${indicatorType} (ID: ${strategyId})`);
    
    // Set the active config indicator and strategy ID directly
    setActiveConfigIndicator(indicatorType);
    setActiveConfigStrategyId(strategyId);
    setConfigDialogOpen(true);
  };

  // Handler for removing from combined strategy
  const handleRemoveFromStrategy = async (strategyId: string) => {
    try {
      console.log(`Removing strategy ${strategyId} from combined strategy`);
      await actions.removeFromStrategy(strategyId);
      
      // The state will be updated by the hook
    } catch (error) {
      console.error(`Error removing strategy from combined strategy:`, error);
    }
  };

  // Update the handleSaveConfig function to work with direct strategy IDs
  const handleSaveConfig = async (indicator: IndicatorType, params: Record<string, any>) => {
    try {
      // Always prioritize activeConfigStrategyId, because it may be a strategy ID 
      // from an indicator no longer in the active indicators list
      const strategyId = activeConfigStrategyId;
      if (!strategyId) {
        throw new Error(`No strategy ID found for configuration`);
      }
      
      console.log(`Configuring strategy ${strategyId} with params:`, params);
      
      // Call the API directly since we're using a specific strategy ID
      const response = await fetch(`http://localhost:8000/api/strategies/${strategyId}/params`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to configure strategy: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Configuration result:', result);
      
      // Refresh charts after configuration
      if (activeTab === '5m') {
        setFiveMinNeedsRefresh(true);
      } else {
        setDailyNeedsRefresh(true);
      }
      
      return result;
    } catch (error) {
      console.error(`Error configuring strategy:`, error);
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
      
      const result = await actions.optimizeStrategyWeights(
        indicator,
        timeframe,
        startDate,
        endDate
      );

      console.log('Optimization API result:', result);

      return result;
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
      
      // Store the signal data
      setSignalData(prev => ({
        ...prev,
        [indicator]: result
      }));
      
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
                  operationState.addToStrategy.isLoading ||
                  operationState.removeFromStrategy.isLoading
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
                  signalData={signalData}
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
                        {combinedStrategyIndicators.length > 0 ? (
                          <ul className="space-y-2">
                            {combinedStrategyIndicators.map((indicator) => (
                              <CombinedStrategyIndicatorRow
                                key={indicator.strategyId}
                                indicator={indicator}
                                onConfigure={handleConfigureCombinedIndicator}
                                onRemove={handleRemoveFromStrategy}
                                isLoading={
                                  operationState.configure.isLoading || 
                                  operationState.removeFromStrategy.isLoading
                                }
                              />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-sm">No indicators added to strategy yet</p>
                        )}
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
                          disabled={combinedStrategyIndicators.length === 0}
                          onClick={() => {
                            if (!selectedAsset) return;
                            const timeframe = activeTab === '5m' ? '5m' : '1d';
                            const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
                            const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
                            
                            // Optimize weights
                            if (strategyState.combinedStrategyId && combinedStrategyIndicators.length > 0) {
                              // Use first indicator in the combined strategy
                              const firstIndicator = combinedStrategyIndicators[0];
                              actions.optimizeStrategyWeights(
                                firstIndicator.indicatorType,
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
                      
                      {activeIndicators.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <p className="text-gray-600 mb-2">Select an indicator to add:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {activeIndicators.map(indicator => {
                              const strategyId = strategies[indicator];
                              // Check if this indicator is already in the combined strategy
                              const isAlreadyInStrategy = combinedStrategyIndicators.some(
                                item => item.strategyId === strategyId
                              );
                              
                              return (
                                <button
                                  key={strategyId}
                                  className={`px-3 py-1 rounded flex items-center gap-1 ${
                                    isAlreadyInStrategy 
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                  onClick={() => !isAlreadyInStrategy && handleAddToStrategy(indicator)}
                                  disabled={isAlreadyInStrategy}
                                >
                                  {isAlreadyInStrategy ? (
                                    <>
                                      <span>{indicator}</span>
                                      <span className="text-xs">(Already Added)</span>
                                    </>
                                  ) : (
                                    <>Add {indicator}</>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                          disabled
                        >
                          No Indicators Available
                        </button>
                      )}
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
        strategyId={activeConfigStrategyId}
        onConfigSave={handleSaveConfig}
        onOptimizeParams={handleOptimizeParamsInDialog}
        onOptimizeWeights={handleOptimizeWeightsInDialog}
      />
    </div>
  );
}