// app/strategy/hooks/useStrategyOperations.ts
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { strategyOperations } from '../utils/strategyOperations';
import { IndicatorType, strategyNameMap } from '../components/IndicatorPanel';
import { PlotJSON } from '@/src/api/index';

export interface StrategyOperation {
  isLoading: boolean;
  error: Error | null;
}

// Interface to store combined strategy indicator info
export interface CombinedStrategyIndicator {
  strategyId: string;
  indicatorType: IndicatorType;
  weight: number;
}

export interface StrategyState {
  activeIndicators: IndicatorType[];
  strategies: Record<IndicatorType, string>;  // Indicator type -> strategy_id
  indicatorPlots: Record<string, PlotJSON>;  // Strategy ID -> Plot data
  combinedStrategyId: string | null;
  // Track combined strategy indicators by their strategy IDs
  combinedStrategyIndicators: CombinedStrategyIndicator[];
}

export interface StrategyOperationState {
  configure: StrategyOperation;
  optimize: StrategyOperation;
  generateSignal: StrategyOperation;
  addToStrategy: StrategyOperation;
  removeFromStrategy: StrategyOperation;
  backtest: StrategyOperation;
  optimizeWeights: StrategyOperation;
}

export default function useStrategyOperations(
  initialState: StrategyState = {
    activeIndicators: [],
    strategies: {},
    indicatorPlots: {},
    combinedStrategyId: null,
    combinedStrategyIndicators: []
  }
) {
  // State for strategy data
  const [state, setState] = useState<StrategyState>(initialState);
  
  // State for operation status
  const [operationState, setOperationState] = useState<StrategyOperationState>({
    configure: { isLoading: false, error: null },
    optimize: { isLoading: false, error: null },
    generateSignal: { isLoading: false, error: null },
    addToStrategy: { isLoading: false, error: null },
    removeFromStrategy: { isLoading: false, error: null },
    backtest: { isLoading: false, error: null },
    optimizeWeights: { isLoading: false, error: null },
  });

  // State for operation results
  const [configureResult, setConfigureResult] = useState<any>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [signalResult, setSignalResult] = useState<any>(null);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [optimizeWeightsResult, setOptimizeWeightsResult] = useState<any>(null);
  
  // Use useRef to maintain the cache across renders
  const indicatorPlotCacheRef = useRef<Record<string, PlotJSON>>({});
  
  // Helper to update operation state
  const updateOperationState = (
    operation: keyof StrategyOperationState,
    isLoading: boolean,
    error: Error | null = null
  ) => {
    setOperationState(prev => ({
      ...prev,
      [operation]: { isLoading, error }
    }));
  };

  // Create a new strategy
  const createStrategy = async (ticker: string, indicator: IndicatorType): Promise<string | null> => {
    try {
      const strategyName = strategyNameMap[indicator];
      const strategyId = await strategyOperations.createStrategy(ticker, strategyName);
      
      // Update state with new strategy
      setState(prev => ({
        ...prev,
        activeIndicators: [...prev.activeIndicators, indicator],
        strategies: {
          ...prev.strategies,
          [indicator]: strategyId
        }
      }));
      
      return strategyId;
    } catch (error) {
      console.error("Error creating strategy:", error);
      return null;
    }
  };

  // Update indicator plots
  const updateIndicatorPlots = async (
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    // Skip if no strategies
    if (Object.keys(state.strategies).length === 0) return;
    
    // Build query params
    const params = new URLSearchParams();
    params.append('timeframe', timeframe);
    
    if (startDate) {
      params.append('start_date', format(startDate, 'yyyy-MM-dd'));
    }
    
    if (endDate) {
      params.append('end_date', format(endDate, 'yyyy-MM-dd'));
    }
    
    const queryString = params.toString();
    
    // Update each strategy plot
    const updatedPlots: Record<string, PlotJSON> = {};
    const strategyFetches = Object.entries(state.strategies).map(async ([indicator, strategyId]) => {
      try {
        // Create a cache key
        const cacheKey = `${strategyId}-${timeframe}-${queryString}`;
        
        // Check if we have this in cache
        if (indicatorPlotCacheRef.current[cacheKey]) {
          updatedPlots[strategyId] = indicatorPlotCacheRef.current[cacheKey];
        } else {
          // Fetch new data
          const plotData = await strategyOperations.getIndicatorPlot(strategyId, queryString);
          indicatorPlotCacheRef.current[cacheKey] = plotData;
          updatedPlots[strategyId] = plotData;
        }
      } catch (error) {
        console.error(`Error updating plot for ${indicator}:`, error);
      }
    });
    
    // Wait for all fetches to complete
    await Promise.all(strategyFetches);
    
    // Update state with new plots
    setState(prev => ({
      ...prev,
      indicatorPlots: updatedPlots
    }));
  };

  // Configure strategy parameters
  const configureIndicator = async (indicator: IndicatorType, params: Record<string, any>) => {
    updateOperationState('configure', true);
    
    try {
      const strategyId = state.strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      const result = await strategyOperations.configureStrategy(strategyId, params);
      setConfigureResult(result);
      updateOperationState('configure', false);
      
      // Clear cache entries for this strategy since params changed
      clearStrategyFromCache(strategyId);
      
      return result;
    } catch (error) {
      updateOperationState('configure', false, error as Error);
      throw error;
    }
  };

  // Optimize strategy parameters
  const optimizeIndicator = async (
    indicator: IndicatorType,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    updateOperationState('optimize', true);
    
    try {
      const strategyId = state.strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
      
      const result = await strategyOperations.optimizeStrategy(
        strategyId,
        timeframe,
        startDateStr,
        endDateStr
      );
      
      setOptimizeResult(result);
      updateOperationState('optimize', false);
      
      // Clear cache entries for this strategy since params will change
      clearStrategyFromCache(strategyId);
      
      return result;
    } catch (error) {
      updateOperationState('optimize', false, error as Error);
      throw error;
    }
  };

  // Optimize weights for a combined strategy
  const optimizeStrategyWeights = async (
    indicator: IndicatorType,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date,
    runs: number = 20
  ) => {
    updateOperationState('optimizeWeights', true);
    
    try {
      const strategyId = state.strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
      
      const result = await strategyOperations.optimizeWeights(
        strategyId,
        timeframe,
        startDateStr,
        endDateStr,
        runs
      );
      
      setOptimizeWeightsResult(result);
      updateOperationState('optimizeWeights', false);
      
      // Clear all cache entries for combined strategy
      clearStrategyFromCache(strategyId);
      
      return result;
    } catch (error) {
      updateOperationState('optimizeWeights', false, error as Error);
      throw error;
    }
  };

  // Generate signals
  const generateSignal = async (
    indicator: IndicatorType,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    updateOperationState('generateSignal', true);
    
    try {
      const strategyId = state.strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
      
      const result = await strategyOperations.generateSignals(
        strategyId,
        timeframe,
        startDateStr,
        endDateStr
      );
      
      setSignalResult(result);
      updateOperationState('generateSignal', false);
      return result;
    } catch (error) {
      updateOperationState('generateSignal', false, error as Error);
      throw error;
    }
  };

  // Add to strategy
  const addToStrategy = async (indicator: IndicatorType, weight: number = 1.0) => {
    updateOperationState('addToStrategy', true);
    
    try {
      const strategyId = state.strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      // If no combined strategy exists yet, create one
      if (!state.combinedStrategyId) {
        const combinedId = await strategyOperations.createCombinedStrategy(strategyId);
        setState(prev => ({
          ...prev,
          combinedStrategyId: combinedId,
          combinedStrategyIndicators: [
            {
              strategyId,
              indicatorType: indicator,
              weight
            }
          ]
        }));
        updateOperationState('addToStrategy', false);
        return combinedId;
      }
      
      // Add to existing combined strategy
      const result = await strategyOperations.addToCombinedStrategy(
        state.combinedStrategyId,
        strategyId,
        weight
      );
      
      // Update state to include this indicator in the combined strategy
      // Only add if the strategy ID is not already in the list
      setState(prev => {
        if (prev.combinedStrategyIndicators.some(item => item.strategyId === strategyId)) {
          return prev; // No change needed, already in the list
        }
        return {
          ...prev,
          combinedStrategyIndicators: [
            ...prev.combinedStrategyIndicators, 
            {
              strategyId,
              indicatorType: indicator,
              weight
            }
          ]
        };
      });
      
      updateOperationState('addToStrategy', false);
      return result;
    } catch (error) {
      updateOperationState('addToStrategy', false, error as Error);
      throw error;
    }
  };

  // Remove from combined strategy
  const removeFromStrategy = async (strategyId: string) => {
    updateOperationState('removeFromStrategy', true);
    
    try {
      if (!state.combinedStrategyId) {
        throw new Error("No combined strategy exists");
      }
      
      // Call the API to remove the strategy
      await strategyOperations.removeFromCombinedStrategy(
        state.combinedStrategyId,
        strategyId
      );
      
      // Update state to remove this indicator from the combined strategy
      setState(prev => ({
        ...prev,
        combinedStrategyIndicators: prev.combinedStrategyIndicators.filter(
          item => item.strategyId !== strategyId
        )
      }));
      
      updateOperationState('removeFromStrategy', false);
    } catch (error) {
      updateOperationState('removeFromStrategy', false, error as Error);
      throw error;
    }
  };

  // Backtest a strategy
  const backtestStrategy = async (
    indicator: IndicatorType,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    updateOperationState('backtest', true);
    
    try {
      const strategyId = state.strategies[indicator];
      if (!strategyId) {
        throw new Error(`No strategy ID found for indicator: ${indicator}`);
      }
      
      const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;
      
      const result = await strategyOperations.backtestStrategy(
        strategyId,
        timeframe,
        startDateStr,
        endDateStr
      );
      
      setBacktestResult(result);
      updateOperationState('backtest', false);
      return result;
    } catch (error) {
      updateOperationState('backtest', false, error as Error);
      throw error;
    }
  };

  // Remove indicator

  const removeIndicator = async (indicator: IndicatorType) => {
    const strategyId = state.strategies[indicator];
    if (!strategyId) return;
    
    try {
      // Call the API to delete the strategy from backend cache
      await strategyOperations.deleteStrategy(strategyId);
      
      // Clear cache entries for this strategy
      clearStrategyFromCache(strategyId);
      
      // Update state to remove indicator from active indicators and strategies
      // but DON'T remove it from combined strategy if it exists there
      setState(prev => {
        const updatedStrategies = { ...prev.strategies };
        delete updatedStrategies[indicator];
        
        const updatedPlots = { ...prev.indicatorPlots };
        delete updatedPlots[strategyId];
        
        return {
          ...prev,
          activeIndicators: prev.activeIndicators.filter(i => i !== indicator),
          strategies: updatedStrategies,
          indicatorPlots: updatedPlots,
          // Don't modify combinedStrategyIndicators here
        };
      });
    } catch (error) {
      console.error(`Error removing strategy for indicator ${indicator}:`, error);
      // You might want to show an error notification here
    }
  };

  // Helper to clear specific strategy from cache
  const clearStrategyFromCache = (strategyId: string) => {
    Object.keys(indicatorPlotCacheRef.current).forEach(key => {
      if (key.startsWith(`${strategyId}-`)) {
        delete indicatorPlotCacheRef.current[key];
      }
    });
  };

  // Clear all plot cache
  const clearPlotCache = () => {
    indicatorPlotCacheRef.current = {};
  };

  return {
    state,
    operationState,
    results: {
      configure: configureResult,
      optimize: optimizeResult,
      signal: signalResult,
      backtest: backtestResult,
      optimizeWeights: optimizeWeightsResult,
    },
    actions: {
      createStrategy,
      updateIndicatorPlots,
      configureIndicator,
      optimizeIndicator,
      generateSignal,
      addToStrategy,
      removeFromStrategy,
      backtestStrategy,
      optimizeStrategyWeights,
      removeIndicator,
      clearPlotCache,
    }
  };
}