// app/strategy/components/dialogs/RSIDialog.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SignalGenerationConfig from './SignalGenerationConfig';

// RSI Signal Types
const RSI_SIGNALS = [
  { value: 'crossover', label: 'Crossover' },
  { value: 'divergence', label: 'Divergence' },
  { value: 'hidden divergence', label: 'Hidden Divergence' }
];

interface RSIDialogProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  isLoading: boolean;
}

export default function RSIDialog({
  params,
  onParamChange,
  isLoading
}: RSIDialogProps) {
  
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
        <Label htmlFor="ub" className="text-right">
          Overbought
        </Label>
        <Input
          id="ub"
          type="number"
          min="0"
          max="100"
          className="col-span-3"
          value={params.ub ?? ''}
          onChange={(e) => handleNumberChange('ub', e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="lb" className="text-right">
          Oversold
        </Label>
        <Input
          id="lb"
          type="number"
          min="0"
          max="100"
          className="col-span-3"
          value={params.lb ?? ''}
          onChange={(e) => handleNumberChange('lb', e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      {/* Separator */}
      <div className="my-2 border-t" />
      
      {/* Signal Exit Strategy */}
      <h4 className="font-medium">Signal Configuration</h4>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="exit-strategy" className="text-right">
          Signal Trigger
        </Label>
        <div className="col-span-3">
          <Select
            disabled={isLoading}
            value={params.exit || 're'}
            onValueChange={(value) => onParamChange('exit', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exit strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="re">On Re-entry</SelectItem>
              <SelectItem value="ex">On Exit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Mean Reversion and MR Bound */}
      <div className="grid grid-cols-8 items-center gap-4">
        <Label htmlFor="m_rev" className="text-right col-span-2">
          Mean Reversion
        </Label>
        <div className="col-span-2 flex items-center">
          <Checkbox 
            id="m_rev" 
            checked={params.m_rev === 1.0}
            onCheckedChange={(checked) => onParamChange('m_rev', checked ? 1.0 : 0.0)}
            disabled={isLoading}
          />
        </div>
        
        <Label htmlFor="m_rev_bound" className="text-right col-span-2">
          MR Bound
        </Label>
        <div className="col-span-2">
          <Input
            id="m_rev_bound"
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="w-full"
            value={params.m_rev_bound ?? ''}
            onChange={(e) => handleNumberChange('m_rev_bound', e.target.value)}
            disabled={isLoading || params.m_rev !== 1.0}
          />
        </div>
      </div>
      
      {/* Separator */}
      <div className="my-2 border-t" />
      
      {/* Signal Generation Config */}
      <SignalGenerationConfig
        params={params}
        onParamChange={onParamChange}
        signalTypes={RSI_SIGNALS}
        isLoading={isLoading}
      />
    </div>
  );
}