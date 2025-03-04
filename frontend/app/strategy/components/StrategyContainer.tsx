// First, update imports to include SaveStrategyDialog
// app/strategy/components/StrategyContainer.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import ChartControls from './ChartControls';
import ChartDisplay from './ChartDisplay';
import TickerInput from '@/app/assets/components/TickerInput';
import { IndicatorType } from './IndicatorPanel';
import useStrategyOperations from '../hooks/useStrategyOperations';
import StrategyConfigDialog from './StrategyConfigDialog';
import CombinedStrategyIndicatorRow from './CombinedStrategyIndicatorRow';
import CombinedStrategyControls from './CombinedStrategyControls';
import BacktestChart from './BacktestChart';
import SignalManagement from './SignalManagement';
import SaveStrategyDialog from './dialogs/SaveStrategyDialog';
import LoadStrategyDialog from './dialogs/LoadStrategyDialog';
import { DefaultService } from '@/src/api';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { getSavedStrategyState, clearSavedStrategyState } from '../utils/strategyPersistence';
import { BookmarkCheck } from 'lucide-react';
import { getIndicatorTypeFromId } from '../utils/strategyIdUtils';

// Then, add a new state for saved strategy info
export default function StrategyContainer() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('5m');
  const [showVolume, setShowVolume] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeConfigIndicator, setActiveConfigIndicator] = useState<IndicatorType | null>(null);
  const [activeConfigStrategyId, setActiveConfigStrategyId] = useState<string | null>(null);
  const [savedStrategy, setSavedStrategy] = useState<{id: string, name: string} | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isCheckingSaveStatus, setIsCheckingSaveStatus] = useState(false);
  const { user } = useAuth();
  
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
  const [signalData, setSignalData] = useState<{
    '5m': Record<string, any>,
    '1d': Record<string, any>
  }>({
    '5m': {},
    '1d': {}
  });

  // backtest results
  const [backtestResults, setBacktestResults] = useState<Record<string, any>>({});
  const [backtestLoading, setBacktestLoading] = useState(false);

  const [combinedParams, setCombinedParams] = useState<Record<string, any>>({
    method: 'weighted',
    vote_threshold: 0,
    weights: []
  });
  
  // Use our custom hook for strategy operations
  const { 
    state: strategyState, 
    operationState, 
    results,
    actions 
  } = useStrategyOperations();

  // Destructure strategy state for easier access
  const { activeStrategies, indicatorPlots, combinedStrategyIndicators } = strategyState;

// Effect to restore saved strategy state after login redirect
useEffect(() => {
  // Only run this effect once on initial mount
  const savedState = getSavedStrategyState();
  
  if (savedState) {
    console.log('Restoring saved strategy state:', savedState);
    
    // Restore the asset selection first
    if (savedState.selectedAsset) {
      setSelectedAsset(savedState.selectedAsset);
    }
    
    // Restore active tab
    if (savedState.activeTab) {
      setActiveTab(savedState.activeTab);
    }
    
    // If there were strategies, restore them properly
    if (savedState.strategyIds && savedState.strategyIds.length > 0 && savedState.selectedAsset) {
      // Step 1: Load unique indicators first (ensuring no duplicates)
      // Use the strategyIdUtils to group strategies by their indicator type
      const strategyIdsByType = new Map<string, string[]>();
      
      savedState.strategyIds.forEach(id => {
        const indicatorType = getIndicatorTypeFromId(id);
        if (indicatorType) {
          if (!strategyIdsByType.has(indicatorType)) {
            strategyIdsByType.set(indicatorType, []);
          }
          strategyIdsByType.get(indicatorType)!.push(id);
        }
      });
      
      // For each indicator type, only load the first strategy ID
      const uniqueStrategyIds: string[] = [];
      strategyIdsByType.forEach((ids) => {
        if (ids.length > 0) {
          uniqueStrategyIds.push(ids[0]);
        }
      });
      
      // Now load each unique strategy
      const loadedStrategies = uniqueStrategyIds.map(strategyId => {
        const success = actions.loadExistingStrategy(strategyId);
        return { id: strategyId, success, indicatorType: getIndicatorTypeFromId(strategyId) };
      }).filter(s => s.success);
      
      // Step 2: If there was a combined strategy, restore reference to it without recreating
      if (savedState.combinedStrategyId && loadedStrategies.length > 0) {
        // Instead of recreating the combined strategy, just update the state to reference it
        actions.setCombinedStrategyId(savedState.combinedStrategyId);
        
        // Also update the combinedStrategyIndicators array with the loaded strategies
        const indicators = loadedStrategies.map(strategy => ({
          strategyId: strategy.id,
          indicatorType: strategy.indicatorType as IndicatorType,
          weight: 1 // Default weight, will be updated when we fetch params
        }));
        
        actions.setCombinedStrategyIndicators(indicators);
        
        // After a short delay to ensure indicators are loaded, fetch the combined parameters
        setTimeout(() => {
          actions.fetchCombinedStrategyParams()
            .then(params => {
              // Update weights if available in the params
              if (params && params.weights && params.weights.length > 0) {
                loadedStrategies.forEach((strategy, index) => {
                  if (index < params.weights.length) {
                    actions.updateIndicatorWeight(strategy.id, params.weights[index]);
                  }
                });
              }
              console.log('Successfully restored combined strategy state');
            })
            .catch(error => {
              console.error('Error fetching combined strategy params:', error);
            });
        }, 500);
      }
    }
    
    // Clear the saved state after restoration
    clearSavedStrategyState();
  }
}, [actions]); // Include only actions in dependencies

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
    if (activeStrategies.length > 0) {
      const currentTimeframe = activeTab === '5m' ? '5m' : '1d';
      const startDate = activeTab === '5m' ? fiveMinStartDate : dailyStartDate;
      const endDate = activeTab === '5m' ? fiveMinEndDate : dailyEndDate;
      
      actions.updateIndicatorPlots(currentTimeframe, startDate, endDate);
    }
  }, [activeTab, fiveMinNeedsRefresh, dailyNeedsRefresh, activeStrategies]);

  // Add effect to fetch combined parameters when needed
  useEffect(() => {
    if (strategyState.combinedStrategyId && combinedStrategyIndicators.length > 0) {
      actions.fetchCombinedStrategyParams()
        .then(params => {
          if (params) {
            setCombinedParams(params);
          }
        })
        .catch(error => {
          console.error('Error fetching combined params:', error);
        });
    }
  }, [strategyState.combinedStrategyId, combinedStrategyIndicators.length]);

  
  // Handle adding a ticker
  const handleAddTicker = (ticker: string) => {
    setSelectedAsset(ticker);
    setFiveMinNeedsRefresh(true);
    setDailyNeedsRefresh(true);
    
    // Reset strategy state when changing tickers
    // Since we don't have a reset method in the hook, we'll just clear everything manually
    activeStrategies.forEach(strategy => {
      actions.removeIndicator(strategy.id);
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

  // Handler for strategy saved
  const handleStrategySaved = (strategyId: string, strategyName: string) => {
    console.log(`Strategy saved with ID: ${strategyId}, Name: ${strategyName}`);
    setSavedStrategy({ id: strategyId, name: strategyName });
    
    // Optional: Show a success message or toast notification
  };
  
  // Handle indicator selection - updated to check if an indicator type already exists
  const handleSelectIndicator = async (indicator: IndicatorType) => {
    if (!selectedAsset) return;
    
    // Check if indicator already exists
    const hasIndicator = activeStrategies.some(s => s.indicator === indicator);
    if (hasIndicator) return;
    
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
  const handleRemoveIndicator = (strategyId: string) => {
    actions.removeIndicator(strategyId);
  
    // Clear signal data for this strategy
    setSignalData(prev => {
      const updated5m = { ...prev['5m'] };
      const updated1d = { ...prev['1d'] };
      delete updated5m[strategyId];
      delete updated1d[strategyId];
      return {
        '5m': updated5m,
        '1d': updated1d
      };
    });
  };
  
  // Handler for configuring an indicator
  const handleConfigureIndicator = async (strategyId: string) => {
    const indicatorType = actions.getIndicatorType(strategyId);
    if (!indicatorType) {
      console.error(`No indicator type found for strategy ${strategyId}`);
      return;
    }
    
    console.log(`Configure ${indicatorType} (ID: ${strategyId})`);
    setActiveConfigIndicator(indicatorType);
    setActiveConfigStrategyId(strategyId);
    setConfigDialogOpen(true);
  };
  
  // Handler for configuring a combined strategy indicator
  const handleConfigureCombinedIndicator = (indicatorType: IndicatorType, strategyId: string) => {
    console.log(`Configure combined strategy indicator ${indicatorType} (ID: ${strategyId})`);
    setActiveConfigIndicator(indicatorType);
    setActiveConfigStrategyId(strategyId);
    setConfigDialogOpen(true);
  };
  
  // Handler for generating signals
  const handleGenerateSignal = async (strategyId: string) => {
    console.log(`Generate signal for strategy ${strategyId}`);
    
    try {
      const currentTimeframe = activeTab;
      const startDate = getActiveStartDate();
      const endDate = getActiveEndDate();
      
      const result = await actions.generateSignal(
        strategyId,
        currentTimeframe,
        startDate,
        endDate
      );
      
      console.log('Signal generation result:', result);
      
      // Store the signal data by timeframe and strategy ID
      setSignalData(prev => ({
        ...prev,
        [currentTimeframe]: {
          ...prev[currentTimeframe],
          [strategyId]: result
        }
      }));
      
    } catch (error) {
      console.error(`Error generating signals for strategy ${strategyId}:`, error);
    }
  };
  
  // 3. Update the handleRemoveSignal function to remove signals by timeframe:
  const handleRemoveSignal = (strategyId: string) => {
    console.log(`Removing signal for strategy ${strategyId} in timeframe ${activeTab}`);
    
    // Remove the signal data for this strategy in the current timeframe
    setSignalData(prev => {
      const updatedTimeframeData = { ...prev[activeTab] };
      delete updatedTimeframeData[strategyId];
      
      return {
        ...prev,
        [activeTab]: updatedTimeframeData
      };
    });
  };
  
  // Handler for adding to strategy
  const handleAddToStrategy = async (strategyId: string) => {
    console.log(`Add strategy ${strategyId} to combined strategy`);
    
    try {
      // Default weight is 1.0
      const result = await actions.addToStrategy(strategyId);
      console.log('Add to strategy result:', result);
      
      if (activeSideTab !== 'strategy') {
        setActiveSideTab('strategy');
      }
      
    } catch (error) {
      console.error(`Error adding strategy ${strategyId} to combined strategy:`, error);
    }
  };
  
  // Handler for optimizing params
  const handleOptimizeParamsInDialog = async (indicator: IndicatorType) => {
    try {
      // Always use activeConfigStrategyId
      if (!activeConfigStrategyId) {
        throw new Error('No strategy ID set for optimization');
      }
      
      console.log(`Optimizing parameters for ${indicator} (ID: ${activeConfigStrategyId})`);
      
      const timeframe = activeTab;
      const startDate = getActiveStartDate();
      const endDate = getActiveEndDate();
      
      const result = await actions.optimizeIndicator(
        activeConfigStrategyId,
        timeframe,
        startDate,
        endDate
      );
      
      console.log('Optimization API result:', result);
      return result;
    } catch (error) {
      console.error(`Error optimizing parameters:`, error);
      throw error;
    }
  };
  
  // Handler for saving config
  const handleSaveConfig = async (indicator: IndicatorType, params: Record<string, any>) => {
    try {
      // Always use activeConfigStrategyId
      if (!activeConfigStrategyId) {
        throw new Error('No strategy ID set for configuration');
      }
      
      console.log(`Configuring strategy ${activeConfigStrategyId} with params:`, params);
      
      const result = await actions.configureIndicator(activeConfigStrategyId, params);
      console.log('Configuration result:', result);
      
      // Refresh charts
      if (activeTab === '5m') {
        setFiveMinNeedsRefresh(true);
      } else {
        setDailyNeedsRefresh(true);
      }
      
      return result;
    } catch (error) {
      console.error(`Error configuring strategy:`, error);
      throw error;
    }
  };

  const handleOptimizeWeightsInDialog = async () => {
    try {
      // Always use activeConfigStrategyId which we've already set
      if (!activeConfigStrategyId) {
        throw new Error('No strategy ID set for weight optimization');
      }
      
      console.log(`Optimizing weights for strategy ID ${activeConfigStrategyId}`);
      
      const timeframe = activeTab;
      const startDate = getActiveStartDate();
      const endDate = getActiveEndDate();
      
      const result = await actions.optimizeStrategyWeights(
        activeConfigStrategyId,  // Use strategyId directly
        timeframe,
        startDate,
        endDate
      );
  
      console.log('Optimization API result:', result);
  
      return result;
    } catch (error) {
      console.error(`Error optimizing weights:`, error);
      throw error;
    }
  };

  // Handler for removing from combined strategy
  const handleRemoveFromStrategy = async (strategyId: string) => {
    try {
      console.log(`Removing strategy ${strategyId} from combined strategy`);
      await actions.removeFromStrategy(strategyId);
      
      // The state will be updated by the hook's removeFromStrategy function
      // which calls fetchCombinedStrategyParams to update weights
    } catch (error) {
      console.error(`Error removing strategy from combined strategy:`, error);
    }
  };
  

  // Add the handler for weight changes
  const handleWeightChange = (strategyId: string, weight: number) => {
    actions.updateIndicatorWeight(strategyId, weight);
    
    // Also update the weights array in the params
    const index = combinedStrategyIndicators.findIndex(item => item.strategyId === strategyId);
    if (index !== -1) {
      const newWeights = [...(combinedParams.weights || [])];
      newWeights[index] = weight;
      setCombinedParams(prev => ({
        ...prev,
        weights: newWeights
      }));
    }
  };

  // Add handler for parameter changes
  const handleCombinedParamChange = (key: string, value: any) => {
    setCombinedParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle optimization of weights for the combined strategy
  const handleOptimizeCombinedWeights = async () => {
    if (!strategyState.combinedStrategyId || combinedStrategyIndicators.length === 0) return;
    
    const timeframe = activeTab;
    const startDate = getActiveStartDate();
    const endDate = getActiveEndDate();
    
    try {
      // Show loading state
      console.log("Optimizing weights for combined strategy...");
      
      // Use the combined strategy ID directly
      const result = await actions.optimizeStrategyWeights(
        strategyState.combinedStrategyId,
        timeframe,
        startDate,
        endDate
      );
      
      console.log("Optimization result:", result);
      
      // Extract optimized weights and vote_threshold directly from the result
      if (result && result.results) {
        const updatedParams = { ...combinedParams };
        
        // Update weights if they exist in the result
        if (result.results.weights) {
          updatedParams.weights = result.results.weights;
          console.log("Setting optimized weights:", result.results.weights);
          
          // Update individual indicator weights in the UI
          result.results.weights.forEach((weight, index) => {
            if (index < combinedStrategyIndicators.length) {
              const strategyId = combinedStrategyIndicators[index].strategyId;
              actions.updateIndicatorWeight(strategyId, weight);
            }
          });
        }
        
        // Update vote threshold if it exists in the result
        if (result.results.vote_threshold !== undefined) {
          updatedParams.vote_threshold = result.results.vote_threshold;
          console.log("Setting optimized vote threshold:", result.results.vote_threshold);
        }
        
        // Update the local state
        setCombinedParams(updatedParams);
        
        // Apply the changes directly to the backend
        try {
          await actions.updateCombinedStrategyParams(updatedParams);
          console.log("Applied optimized parameters to backend");
        } catch (error) {
          console.error("Error applying optimized parameters:", error);
        }
      }
    } catch (error) {
      console.error('Error optimizing weights:', error);
    }
  };

  // Add handler to apply changes
  const handleApplyCombinedChanges = async () => {
    try {
      // Ensure weights array matches the indicators
      const weights = combinedStrategyIndicators.map(item => item.weight);
      
      // Create the params object to send
      const paramsToUpdate = {
        ...combinedParams,
        weights
      };
      
      await actions.updateCombinedStrategyParams(paramsToUpdate);
      await actions.fetchCombinedStrategyParams();
      console.log('Combined strategy parameters updated successfully');
    } catch (error) {
      console.error('Error updating combined strategy parameters:', error);
    }
  };

  // Add handler for backtesting
  const handleBacktest = async (startDate?: Date, endDate?: Date) => {
    if (!strategyState.combinedStrategyId) {
      console.error('No combined strategy ID found for backtesting');
      return;
    }
  
    setBacktestLoading(true);
    
    try {
      // Always use the current activeTab for timeframe
      const currentTimeframe = activeTab;
      
      // Use provided dates if available, otherwise use active ones
      const effectiveStartDate = startDate || getActiveStartDate();
      const effectiveEndDate = endDate || getActiveEndDate();
      
      const result = await actions.backtestStrategy(
        strategyState.combinedStrategyId,
        currentTimeframe,
        effectiveStartDate,
        effectiveEndDate
      );
      console.log('Backtest result:', result);
      
      setBacktestResults(result);
    } catch (error) {
      console.error('Error backtesting combined strategy:', error);
    } finally {
      setBacktestLoading(false);
    }
  };

  // Function to check if the strategy has been saved
  const checkSaveStatus = useCallback(async () => {
    // Only check if we have a user and a strategy name to check
    if (!user || !strategyState.combinedStrategyId) {
      setIsCheckingSaveStatus(false);
      return;
    }
    
    setIsCheckingSaveStatus(true);
    
    try {
      // Try to find any strategies for this user with this combined strategy ID
      // This is a simplified check - in practice, you'd use the saved strategy name
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setSavedStrategy({
          id: data.id,
          name: data.name
        });
        setIsSaved(true);
      } else {
        setSavedStrategy(null);
        setIsSaved(false);
      }
    } catch (error) {
      console.error('Error checking save status:', error);
      setSavedStrategy(null);
      setIsSaved(false);
    } finally {
      setIsCheckingSaveStatus(false);
    }
  }, [user, strategyState.combinedStrategyId]);

  const handleStrategyLoaded = async (strategyId: string, strategyName: string) => {
    console.log(`Loading strategy: ${strategyName} (${strategyId})`);
    
    try {
      // Reset any existing strategy
      activeStrategies.forEach(strategy => {
        actions.removeIndicator(strategy.id);
      });
      
      // Fetch the strategy parameters from Supabase
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .select('parameters')
        .eq('id', strategyId)
        .single();
      
      if (strategyError) {
        throw new Error(`Error fetching strategy: ${strategyError.message}`);
      }
      
      // Fetch all associated strategy indicators
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('strategy_indicators')
        .select('type, parameters')
        .eq('strategy_id', strategyId);
      
      if (indicatorsError) {
        throw new Error(`Error fetching strategy indicators: ${indicatorsError.message}`);
      }
      
      // Prepare the payload in the exact format expected by the API
      const payload = {
        params: {
          params: strategyData.parameters,
          indicators: indicatorsData.map(indicator => ({
            type: indicator.type,
            params: indicator.parameters
          }))
        },
        asset: selectedAsset
      };
      
      console.log('Loading strategy with payload:', payload);
      
      // Call the API with the structured payload
      const loadedStrategy = await DefaultService.loadCombinedStrategyApiStrategiesLoadPost(payload);
      
      console.log('Strategy loaded successfully:', loadedStrategy);
      
      // The backend now returns individual indicator IDs
      if (loadedStrategy.indicators && Array.isArray(loadedStrategy.indicators)) {
        console.log("Adding indicators to strategy state:", loadedStrategy.indicators);
        
        // Add each indicator to the state
        loadedStrategy.indicators.forEach((indicatorId, index) => {
          if (index < indicatorsData.length) {
            const indicatorType = indicatorsData[index].type;
            
            // Add this indicator to activeStrategies
            actions.loadExistingStrategy(indicatorId);
          }
        });
      }
      
      // Set the combined strategy ID from the API response
      if (loadedStrategy.strategy_id) {
        actions.setCombinedStrategyId(loadedStrategy.strategy_id);
        
        // After setting the combined strategy ID, add the indicators to it
        if (loadedStrategy.indicators && Array.isArray(loadedStrategy.indicators)) {
          // Create combined strategy indicators
          const combinedIndicators = loadedStrategy.indicators.map((indicatorId, index) => {
            if (index < indicatorsData.length) {
              return {
                strategyId: indicatorId,
                indicatorType: indicatorsData[index].type as IndicatorType,
                weight: 1 // Default weight, will be updated from strategy parameters
              };
            }
            return null;
          }).filter(Boolean);
          
          // Set combined strategy indicators
          actions.setCombinedStrategyIndicators(combinedIndicators);
        }
      }
      
      // Update local state
      setSavedStrategy({ id: strategyId, name: strategyName });
      setIsSaved(true);
      
      // Switch to strategy tab
      setActiveSideTab('strategy');
      
      // Force data refresh
      setFiveMinNeedsRefresh(true);
      setDailyNeedsRefresh(true);
      
      // After a short delay, update indicator weights based on loaded parameters
      setTimeout(() => {
        if (loadedStrategy.strategy_id) {
          actions.fetchCombinedStrategyParams()
            .then(params => {
              if (params && params.weights && params.weights.length > 0) {
                loadedStrategy.indicators.forEach((indicatorId, index) => {
                  if (index < params.weights.length) {
                    actions.updateIndicatorWeight(indicatorId, params.weights[index]);
                  }
                });
              }
            })
            .catch(error => {
              console.error('Error updating indicator weights:', error);
            });
        }
      }, 500);
    } catch (error) {
      console.error('Error loading strategy:', error);
    }
  };

  // Add this effect to check save status when user or strategy changes
  useEffect(() => {
    if (user) {
      checkSaveStatus();
    } else {
      setIsSaved(false);
      setSavedStrategy(null);
    }
  }, [checkSaveStatus, user]);

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
                activeStrategies={activeStrategies}
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
                <div className="flex flex-col h-full">
                <ChartDisplay 
                  ticker={selectedAsset}
                  activeTab={activeTab}
                  showIndicators={activeStrategies.length > 0}
                  fiveMinQueryString={fiveMinQueryString}
                  dailyQueryString={dailyQueryString}
                  onFiveMinLoad={handleFiveMinLoad}
                  onDailyLoad={handleDailyLoad}
                  skipFiveMinFetch={!fiveMinNeedsRefresh}
                  skipDailyFetch={!dailyNeedsRefresh}
                  activeStrategies={activeStrategies}
                  indicatorPlots={indicatorPlots}
                  signalData={signalData[activeTab]}
                />
                <SignalManagement
                activeStrategies={activeStrategies}
                signalData={signalData[activeTab]}
                onRemoveSignal={handleRemoveSignal}
                timeframe={activeTab}
                />
                </div>
              </TabsContent>
              
              <TabsContent value="strategy" className="h-full mt-0 w-full">
                <div className="h-[90vh] p-2 border rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-medium">Strategy Builder</h3>
                    {user && <LoadStrategyDialog onStrategyLoaded={handleStrategyLoaded} />}
                  </div>
                  
                  {strategyState.combinedStrategyId ? (
                    <div className="space-y-4 flex flex-col h-[95%]">
                      {/* Combined Strategy Controls */}
                      <CombinedStrategyControls
                        params={combinedParams}
                        onParamChange={handleCombinedParamChange}
                        isLoading={operationState.optimize.isLoading || operationState.backtest.isLoading}
                        onBacktest={handleBacktest}
                        onOptimizeWeights={handleOptimizeCombinedWeights}
                        onApplyChanges={handleApplyCombinedChanges}
                        currentTimeframe={activeTab}
                        currentStartDate={getActiveStartDate()}
                        currentEndDate={getActiveEndDate()}
                      />

                      {/* Add Save Strategy button with dialog */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          {isSaved && (
                            <div className="flex items-center text-sm text-green-400 gap-1 mr-2">
                              <BookmarkCheck size={16} />
                              <span>Saved as "{savedStrategy?.name}"</span>
                            </div>
                          )}
                        </div>
                        <SaveStrategyDialog 
                          combinedStrategyId={strategyState.combinedStrategyId}
                          asset={selectedAsset}
                          activeTab={activeTab}
                          strategyIds={activeStrategies.map(strategy => strategy.id)}
                          isDisabled={combinedStrategyIndicators.length === 0 || isCheckingSaveStatus}
                          onStrategySaved={handleStrategySaved}
                        />
                      </div>
                      
                        <h4 className="font-medium text-sm mb-2">Strategy Components</h4>
                        {combinedStrategyIndicators.length > 0 ? (
                          <div className="flex flex-wrap">
                            {combinedStrategyIndicators.map((indicator) => (
                              <CombinedStrategyIndicatorRow
                                key={indicator.strategyId}
                                indicator={indicator}
                                onConfigure={handleConfigureCombinedIndicator}
                                onRemove={handleRemoveFromStrategy}
                                onWeightChange={handleWeightChange}
                                isWeightEditable={combinedParams.method === 'weighted'}
                                isLoading={
                                  operationState.configure.isLoading || 
                                  operationState.removeFromStrategy.isLoading
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">No indicators added to strategy yet</p>
                        )}
                      {/* </div> */}

                      <div className="border p-2 pb-1 rounded-lg flex-1 flex flex-col">
                        <h4 className="font-medium text-sm mb-2">Backtest Results</h4>
                        <div className="flex-1 min-h-0">
                          {backtestLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <span>Loading backtest results...</span>
                            </div>
                          ) : (
                            <BacktestChart backtestResults={backtestResults} />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-gray-500 mb-4">Add indicators to your strategy using the "Add to Strategy" option</p>
                      
                      {activeStrategies.length > 0 ? (
                        <div className="flex flex-col items-center">
                          <p className="text-gray-600 mb-2">Select an indicator to add:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {activeStrategies.map(strategy => {
                              const strategyId = strategy.id;
                              // Check if this indicator is already in the combined strategy
                              const isAlreadyInStrategy = combinedStrategyIndicators.some(
                                item => item.strategyId === strategyId
                              );
                              
                              return (
                                <Button
                                  key={strategyId}
                                  className={`px-3 py-1 rounded flex items-center gap-1 ${
                                    isAlreadyInStrategy 
                                      ? 'bg-gray-200 text-gray cursor-not-allowed' 
                                      : ''
                                  }`}
                                  onClick={() => !isAlreadyInStrategy && handleAddToStrategy(strategyId)}
                                  disabled={isAlreadyInStrategy}
                                >
                                  {isAlreadyInStrategy ? (
                                    <>
                                      <span>{strategy.indicator}</span>
                                      <span className="text-xs">(Already Added)</span>
                                    </>
                                  ) : (
                                    <>Add {strategy.indicator}</>
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <Button 
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                          disabled
                        >
                          No Indicators Available
                        </Button>
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