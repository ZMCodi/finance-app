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
}

export default function StrategyConfigDialog({
  open,
  onOpenChange,
  indicator,
  strategyId,
  onConfigSave
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
          />
        );
        
      case 'RSI':
        return (
          <RSIDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
          />
        );
        
      case 'MACD':
        return (
          <MACDDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
          />
        );
        
      case 'Bollinger Bands':
        return (
          <BollingerBandsDialog
            params={params}
            onParamChange={handleParamChange}
            isLoading={isLoading}
          />
        );
        
      default:
        return null;
    }
  };

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