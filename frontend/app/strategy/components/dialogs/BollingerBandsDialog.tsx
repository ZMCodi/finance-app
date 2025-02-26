// app/strategy/components/dialogs/BollingerBandsDialog.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SignalGenerationConfig from './SignalGenerationConfig';

// Bollinger Bands Signal Types
const BB_SIGNALS = [
  { value: 'bounce', label: 'Bounce' },
  { value: 'double', label: 'Double' },
  { value: 'walks', label: 'Walks' },
  { value: 'squeeze', label: 'Squeeze' },
  { value: 'breakout', label: 'Breakout' },
  { value: '%B', label: '%B' }
];

interface BollingerBandsDialogProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  isLoading: boolean;
  onOptimizeParams?: () => Promise<void>;
  onOptimizeWeights?: () => Promise<void>;
}

export default function BollingerBandsDialog({
  params,
  onParamChange,
  isLoading,
  onOptimizeParams,
  onOptimizeWeights
}: BollingerBandsDialogProps) {
  
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
        <Label htmlFor="window" className="text-right">
          Window
        </Label>
        <Input
          id="window"
          type="number"
          min="1"
          className="col-span-3"
          value={params.window ?? ''}
          onChange={(e) => handleNumberChange('window', e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="num_std" className="text-right">
          Standard Deviations
        </Label>
        <Input
          id="num_std"
          type="number"
          min="0.1"
          step="0.1"
          className="col-span-3"
          value={params.num_std ?? ''}
          onChange={(e) => handleNumberChange('num_std', e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      {/* Separator */}
      <div className="my-2 border-t" />
      
      {/* Signal Generation Config */}
      <SignalGenerationConfig
        params={params}
        onParamChange={onParamChange}
        signalTypes={BB_SIGNALS}
        isLoading={isLoading}
        onOptimizeWeights={onOptimizeWeights}
      />
    </div>
  );
}