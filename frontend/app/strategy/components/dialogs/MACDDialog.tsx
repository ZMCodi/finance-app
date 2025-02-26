// app/strategy/components/dialogs/MACDDialog.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SignalGenerationConfig from './SignalGenerationConfig';

// MACD Signal Types
const MACD_SIGNALS = [
  { value: 'crossover', label: 'Crossover' },
  { value: 'divergence', label: 'Divergence' },
  { value: 'hidden divergence', label: 'Hidden Divergence' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'double peak/trough', label: 'Double Peaks/Troughs' }
];

interface MACDDialogProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  isLoading: boolean;
  onOptimizeParams?: () => Promise<void>;
  onOptimizeWeights?: () => Promise<void>;
}

export default function MACDDialog({
  params,
  onParamChange,
  isLoading,
  onOptimizeParams,
  onOptimizeWeights
}: MACDDialogProps) {
  
  // Handle number input change (convert string to number)
  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onParamChange(key, numValue);
  };

  return (
    <div className="grid gap-4 py-4">
      {/* Technical Indicator Parameters with Optimize Button */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Technical Indicator Parameters</h4>
        {onOptimizeParams && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOptimizeParams}
            disabled={isLoading}
            className="h-8 flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="text-xs">Optimize</span>
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="fast" className="text-right">
          Fast Period
        </Label>
        <Input
          id="fast"
          type="number"
          min="1"
          className="col-span-3"
          value={params.fast ?? ''}
          onChange={(e) => handleNumberChange('fast', e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="slow" className="text-right">
          Slow Period
        </Label>
        <Input
          id="slow"
          type="number"
          min="1"
          className="col-span-3"
          value={params.slow ?? ''}
          onChange={(e) => handleNumberChange('slow', e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="signal" className="text-right">
          Signal Period
        </Label>
        <Input
          id="signal"
          type="number"
          min="1"
          className="col-span-3"
          value={params.signal ?? ''}
          onChange={(e) => handleNumberChange('signal', e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      {/* Separator */}
      <div className="my-2 border-t" />
      
      {/* Signal Generation Config */}
      <SignalGenerationConfig
        params={params}
        onParamChange={onParamChange}
        signalTypes={MACD_SIGNALS}
        isLoading={isLoading}
        onOptimizeWeights={onOptimizeWeights}
      />
    </div>
  );
}