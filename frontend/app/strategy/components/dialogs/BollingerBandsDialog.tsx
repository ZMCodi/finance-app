// app/strategy/components/dialogs/BollingerBandsDialog.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
}

export default function BollingerBandsDialog({
  params,
  onParamChange,
  isLoading
}: BollingerBandsDialogProps) {
  
  // Handle number input change (convert string to number)
  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onParamChange(key, numValue);
  };

  return (
    <div className="grid gap-4 py-4">
      {/* Technical Indicator Parameters */}
      <h4 className="font-medium">Technical Indicator Parameters</h4>
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
      />
    </div>
  );
}