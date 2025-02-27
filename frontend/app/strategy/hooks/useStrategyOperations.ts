// app/strategy/hooks/useStrategyOperations.ts
import { useState, useRef } from 'react';
import { strategyOperations } from '../utils/strategyOperations';
import { IndicatorType, strategyNameMap } from '../components/IndicatorPanel';
import { PlotJSON } from '@/src/api/index';
import { getIndicatorTypeFromId } from '../utils/strategyIdUtils';

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

export interface ActiveStrategy {
  id: string;
  indicator: IndicatorType;
}

export interface StrategyState {
  activeStrategies: ActiveStrategy[];
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
  fetchCombinedParams: StrategyOperation;
}

export default function useStrategyOperations(
  initialState: StrategyState = {
    activeStrategies: [],
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
    fetchCombinedParams: { isLoading: false, error: null }
  });

  // State for operation results
  const [configureResult, setConfigureResult] = useState<any>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [signalResult, setSignalResult] = useState<any>(null);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [optimizeWeightsResult, setOptimizeWeightsResult] = useState<any>(null);
  const [combinedStrategyParams, setCombinedStrategyParams] = useState<Record<string, any>>({
    method: 'weighted',
    vote_threshold: 0,
    weights: []
  });
  
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
        activeStrategies: [...prev.activeStrategies, { id: strategyId, indicator }]
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
    endDate?: Date,
    showVolume: boolean = true
  ) => {
    // Skip if no strategies
    if (state.activeStrategies.length === 0) return;
    
    // Get all strategy IDs
    const strategyIds = state.activeStrategies.map(s => s.id);
    
    try {
      // Use the new method from strategyOperations
      const plots = await strategyOperations.getIndicatorPlots(
        strategyIds,
        timeframe,
        startDate,
        endDate,
        showVolume
      );
      
      // Update state with new plots
      setState(prev => ({
        ...prev,
        indicatorPlots: plots
      }));
    } catch (error) {
      console.error("Error updating indicator plots:", error);
    }
  };

  // Configure strategy parameters
  const configureIndicator = async (strategyId: string, params: Record<string, any>) => {
    updateOperationState('configure', true);
    
    try {
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
    strategyId: string,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    updateOperationState('optimize', true);
    
    try {
      const result = await strategyOperations.optimizeStrategy(
        strategyId,
        timeframe,
        startDate,
        endDate
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
    strategyId: string,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date,
    runs: number = 20
  ) => {
    updateOperationState('optimizeWeights', true);
    
    try {
      const result = await strategyOperations.optimizeWeights(
        strategyId,
        timeframe,
        startDate,
        endDate,
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
    strategyId: string,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    updateOperationState('generateSignal', true);
    
    try {
      const result = await strategyOperations.generateSignals(
        strategyId,
        timeframe,
        startDate,
        endDate
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
  const addToStrategy = async (strategyId: string, weight: number = 1.0) => {
    updateOperationState('addToStrategy', true);
    
    try {
      // Get the indicator type for this strategy ID
      const indicatorType = getIndicatorTypeFromId(strategyId);
      
      if (!indicatorType) {
        throw new Error(`Unknown indicator type for strategy ID: ${strategyId}`);
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
              indicatorType,
              weight
            }
          ]
        }));
        
        // Get initial parameters after creating
        await fetchCombinedStrategyParams();
        
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
              indicatorType,
              weight
            }
          ]
        };
      });
      
      // Fetch updated parameters including weights
      await fetchCombinedStrategyParams();
      
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
      
      // Call the API to remove the strategy from the combined strategy
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
      
      // Check if this strategy is still in the active indicators
      const isInActiveIndicators = state.activeStrategies.some(
        strategy => strategy.id === strategyId
      );
      
      // If it's not in active indicators anymore, we can delete it from cache
      if (!isInActiveIndicators) {
        console.log(`Strategy ${strategyId} is not in active indicators, deleting from cache`);
        await strategyOperations.deleteStrategy(strategyId);
      } else {
        console.log(`Strategy ${strategyId} is still in active indicators, keeping in cache`);
      }
      
      // Fetch updated parameters to get renormalized weights
      await fetchCombinedStrategyParams();
      
      updateOperationState('removeFromStrategy', false);
    } catch (error) {
      updateOperationState('removeFromStrategy', false, error as Error);
      throw error;
    }
  };

  // Fetch combined strategy parameters
  const fetchCombinedStrategyParams = async () => {
    if (!state.combinedStrategyId) return null;
    
    updateOperationState('fetchCombinedParams', true);
    
    try {
      const params = await strategyOperations.fetchCombinedStrategyParams(state.combinedStrategyId);
      if (params) {
        setCombinedStrategyParams(params);
      
        // Update weights in combined strategy indicators
        if (params.weights) {
          setState(prev => {
            const updatedIndicators = prev.combinedStrategyIndicators.map((item, index) => ({
              ...item,
              weight: index < params.weights.length ? params.weights[index] : item.weight
            }));
            
            console.log("Updated indicator weights:", updatedIndicators.map(i => i.weight));
            
            return {
              ...prev,
              combinedStrategyIndicators: updatedIndicators
            };
          });
        }
      }
      
      updateOperationState('fetchCombinedParams', false);
      return params;
    } catch (error) {
      updateOperationState('fetchCombinedParams', false, error as Error);
      console.error('Error fetching combined strategy params:', error);
      throw error;
    }
  };

  // Update combined strategy parameters
  const updateCombinedStrategyParams = async (params: Record<string, any>) => {
    if (!state.combinedStrategyId) return;
    
    updateOperationState('configure', true);
    
    try {
      console.log("Updating combined strategy params:", params);
      
      const data = await strategyOperations.updateCombinedStrategyParams(
        state.combinedStrategyId, 
        params
      );
      
      // Update the state with the new parameters
      // But DON'T fetch new parameters as they might override our optimized values
      setCombinedStrategyParams(params);
      
      // Update indicator weights in the UI based on the params we just sent
      if (params.weights) {
        setState(prev => {
          const updatedIndicators = prev.combinedStrategyIndicators.map((item, index) => ({
            ...item,
            weight: index < params.weights.length ? params.weights[index] : item.weight
          }));
          
          console.log("Updated indicator weights:", updatedIndicators.map(i => i.weight));
          
          return {
            ...prev,
            combinedStrategyIndicators: updatedIndicators
          };
        });
      }
      
      updateOperationState('configure', false);
      return data;
    } catch (error) {
      updateOperationState('configure', false, error as Error);
      console.error('Error updating combined strategy params:', error);
      throw error;
    }
  };

  // Update a specific indicator weight
  const updateIndicatorWeight = (strategyId: string, weight: number) => {
    setState(prev => {
      const updatedIndicators = prev.combinedStrategyIndicators.map(item => 
        item.strategyId === strategyId ? { ...item, weight } : item
      );
      
      return {
        ...prev,
        combinedStrategyIndicators: updatedIndicators
      };
    });
  };

  // Backtest a strategy
  const backtestStrategy = async (
    strategyId: string,
    timeframe: string = '1d',
    startDate?: Date,
    endDate?: Date
  ) => {
    updateOperationState('backtest', true);
    
    try {
      const result = await strategyOperations.backtestStrategy(
        strategyId,
        timeframe,
        startDate,
        endDate
      );
      
      setBacktestResult(result);
      updateOperationState('backtest', false);
      return result;
    } catch (error) {
      updateOperationState('backtest', false, error as Error);
      throw error;
    }
  };

  // Remove indicator from active strategies
  const removeIndicator = async (strategyId: string) => {
    try {
      // Check if this strategy is part of a combined strategy
      const isInCombinedStrategy = state.combinedStrategyIndicators.some(
        item => item.strategyId === strategyId
      );
      
      // Only delete from backend cache if it's not in a combined strategy
      if (!isInCombinedStrategy) {
        console.log(`Strategy ${strategyId} is not in combined strategy, deleting from cache`);
        await strategyOperations.deleteStrategy(strategyId);
      } else {
        console.log(`Strategy ${strategyId} is in combined strategy, keeping in cache`);
      }
      
      // Clear cache entries for this strategy (local frontend cache)
      clearStrategyFromCache(strategyId);
      
      // Update state to remove the strategy from active strategies
      setState(prev => {
        const updatedActiveStrategies = prev.activeStrategies.filter(
          strategy => strategy.id !== strategyId
        );
        
        const updatedPlots = { ...prev.indicatorPlots };
        delete updatedPlots[strategyId];
        
        return {
          ...prev,
          activeStrategies: updatedActiveStrategies,
          indicatorPlots: updatedPlots,
        };
      });
    } catch (error) {
      console.error(`Error removing strategy with ID ${strategyId}:`, error);
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

  // Get indicator type from strategy ID
  const getIndicatorType = (strategyId: string): IndicatorType | null => {
    // First check if it's in our active strategies
    const activeStrategy = state.activeStrategies.find(s => s.id === strategyId);
    if (activeStrategy) {
      return activeStrategy.indicator;
    }
    
    // Next check combined strategy indicators
    const combinedStrategy = state.combinedStrategyIndicators.find(s => s.strategyId === strategyId);
    if (combinedStrategy) {
      return combinedStrategy.indicatorType;
    }
    
    // Finally use the utility function as fallback
    return getIndicatorTypeFromId(strategyId);
  };

  return {
    state,
    operationState,
    combinedStrategyParams,
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
      fetchCombinedStrategyParams,
      updateCombinedStrategyParams,
      updateIndicatorWeight,
      getIndicatorType,
    }
  };
}