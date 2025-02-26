// app/strategy/components/StrategyConfigDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IndicatorType } from './IndicatorPanel';
import { StrategyParams } from '@/src/api/index';

// Import individual dialog components
import MACrossoverDialog from './dialogs/MACrossoverDialog';
import RSIDialog from './dialogs/RSIDialog';
import MACDDialog from './dialogs/MACDDialog';
import BollingerBandsDialog from './dialogs/BollingerBandsDialog';

// Default parameters for different strategy types
const defaultParamTemplates: Record<IndicatorType, Record<string, any>> = {
  'MA Crossover': {
    short: 10,
    long: 50,
    ewm: false,
    ptype: 'window'
  },
  'RSI': {
    window: 14,
    ub: 70,
    lb: 30,
    exit: 'neutral',
    signal_type: ['crossover'],
    weights: [1.0],
    method: 'weighted',
    vote_threshold: 0, // Default is 50% as majority
    m_rev: 0.0,
    m_rev_bound: 50
  },
  'MACD': {
    fast: 12,
    slow: 26,
    signal: 9,
    signal_type: ['crossover'],
    weights: [1.0],
    method: 'weighted',
    vote_threshold: 0 // Default is 50% as majority
  },
  'Bollinger Bands': {
    window: 20,
    num_std: 2,
    signal_type: ['bounce'],
    weights: [1.0],
    method: 'weighted',
    vote_threshold: 0 // Default is 50% as majority
  }
};

interface StrategyConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: IndicatorType | null;
  strategyId: string | null;
  onConfigSave: (indicator: IndicatorType, params: Record<string, any>) => Promise<void>;
  onOptimizeParams?: (indicator: IndicatorType) => Promise<void>;
  onOptimizeWeights?: (indicator: IndicatorType) => Promise<void>;
}

export default function StrategyConfigDialog({
  open,
  onOpenChange,
  indicator,
  strategyId,
  onConfigSave,
  onOptimizeParams,
  onOptimizeWeights
}: StrategyConfigDialogProps) {
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Parameter states
  const [params, setParams] = useState<Record<string, any>>({});
  
  // Load current parameters when dialog opens
  useEffect(() => {
    if (open && indicator && strategyId) {
      loadCurrentParams();
    }
  }, [open, indicator, strategyId]);

  // Load current parameters from API
  const loadCurrentParams = async () => {
    if (!strategyId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/strategies/${strategyId}/params`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch parameters: ${response.statusText}`);
      }
      
      const data: StrategyParams = await response.json();
      console.log(data);
      
      // Set parameters from API response
      if (data.params) {
        setParams(data.params);
      } else {
        // If no params returned, use defaults for this indicator type
        setParams(indicator ? defaultParamTemplates[indicator] : {});
      }
    } catch (error) {
      console.error('Error loading parameters:', error);
      setError('Failed to load current parameters');
      
      // Set defaults on error
      if (indicator) {
        setParams(defaultParamTemplates[indicator]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle parameter change
  const handleParamChange = (key: string, value: any) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!indicator) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert empty string values to defaults
      const cleanedParams = { ...params };
      
      // For each parameter, if it's an empty string, use the default value
      Object.keys(cleanedParams).forEach(key => {
        if (cleanedParams[key] === '') {
          cleanedParams[key] = indicator ? 
            defaultParamTemplates[indicator][key] : null;
        }
      });
      
      await onConfigSave(indicator, cleanedParams);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving parameters:', error);
      setError('Failed to save parameters');
    } finally {
      setIsLoading(false);
    }
  };

// Handle the optimize params click in StrategyConfigDialog.tsx
    const handleOptimizeParams = async () => {
        if (!indicator || !onOptimizeParams) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
        const optimizationResult = await onOptimizeParams(indicator);
        
        console.log('Got optimization result:', optimizationResult);
        
        // Extract from the correct structure: response.results.params
        if (optimizationResult && optimizationResult.results && optimizationResult.results.params) {
            const optimizedParams = optimizationResult.results.params;
            
            // Apply the optimized parameters
            setParams({
            ...params,
            ...optimizedParams
            });
            
            console.log('Applied optimized parameters:', optimizedParams);
        } else {
            console.warn('Optimization did not return usable parameters', optimizationResult);
        }
        } catch (error) {
        console.error('Error optimizing parameters:', error);
        setError('Failed to optimize parameters');
        } finally {
        setIsLoading(false);
        }
    };

    // Handle the optimize weights click in StrategyConfigDialog.tsx
    const handleOptimizeWeights = async () => {
        if (!indicator || !onOptimizeWeights) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
        const optimizationResult = await onOptimizeWeights(indicator);
        
        console.log('Weights optimization result:', optimizationResult);
        
        // Extract from the correct structure: response.results.weights and response.results.vote_threshold
        if (optimizationResult && optimizationResult.results) {
            const updatedParams = {...params};
            
            // Apply weights if they exist
            if (optimizationResult.results.weights) {
            updatedParams.weights = optimizationResult.results.weights;
            console.log('Applying optimized weights:', optimizationResult.results.weights);
            }
            
            // Apply vote threshold if it exists
            if (optimizationResult.results.vote_threshold !== undefined) {
            updatedParams.vote_threshold = optimizationResult.results.vote_threshold;
            console.log('Applying optimized vote threshold:', optimizationResult.results.vote_threshold);
            }
            
            // Apply any other parameters from results.params if they exist
            if (optimizationResult.results.params) {
            Object.assign(updatedParams, optimizationResult.results.params);
            console.log('Applying other optimized params:', optimizationResult.results.params);
            }
            
            setParams(updatedParams);
            console.log('Final updated params:', updatedParams);
        } else {
            console.warn('Weight optimization did not return results in expected structure', optimizationResult);
        }
        } catch (error) {
        console.error('Error optimizing weights:', error);
        setError('Failed to optimize weights');
        } finally {
        setIsLoading(false);
        }
    };

  // Render the appropriate dialog based on the indicator type
  const renderDialogContent = () => {
    if (!indicator) return null;
    
    switch(indicator) {
      case 'MA Crossover':
        return (
          <MACrossoverDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
            onOptimizeParams={onOptimizeParams ? handleOptimizeParams : undefined}
          />
        );
        
      case 'RSI':
        return (
          <RSIDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
            onOptimizeParams={onOptimizeParams ? handleOptimizeParams : undefined}
            onOptimizeWeights={onOptimizeWeights ? handleOptimizeWeights : undefined}
          />
        );
        
      case 'MACD':
        return (
          <MACDDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
            onOptimizeParams={onOptimizeParams ? handleOptimizeParams : undefined}
            onOptimizeWeights={onOptimizeWeights ? handleOptimizeWeights : undefined}
          />
        );
        
      case 'Bollinger Bands':
        return (
          <BollingerBandsDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
            onOptimizeParams={onOptimizeParams ? handleOptimizeParams : undefined}
            onOptimizeWeights={onOptimizeWeights ? handleOptimizeWeights : undefined}
          />
        );
        
      default:
        return null;
    }
  };

  // Rest of the component remains the same
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {indicator ? `Configure ${indicator}` : 'Configure Strategy'}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading && <div className="py-6 text-center">Loading parameters...</div>}
        
        {error && (
          <div className="py-2 text-center text-red-500">
            {error}
          </div>
        )}
        
        {!isLoading && !error && renderDialogContent()}
        
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}