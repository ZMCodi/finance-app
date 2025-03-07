// app/strategy/components/dialogs/MACrossoverDialog.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MACrossoverDialogProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  isLoading: boolean;
  onOptimizeParams?: () => Promise<void>;
}

export default function MACrossoverDialog({
  params,
  onParamChange,
  isLoading,
  onOptimizeParams
}: MACrossoverDialogProps) {
  
  // Handle number input change (convert string to number)
  console.log('params:', params);
  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onParamChange(key, numValue);
  };
  const isEwmEnabled = params.ewm === true || params.ewm === 1 || params.ewm === "true";

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
        <Label htmlFor="short" className="text-right">
          Short
        </Label>
        <Input
          id="short"
          type="number"
          min="1"
          className="col-span-3"
          value={params.short ?? ''}
          onChange={(e) => handleNumberChange('short', e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="long" className="text-right">
          Long
        </Label>
        <Input
          id="long"
          type="number"
          min="1"
          className="col-span-3"
          value={params.long ?? ''}
          onChange={(e) => handleNumberChange('long', e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      {/* EWMA options */}
      <div className="grid grid-cols-4 items-center gap-4">
        <div className="col-span-4 flex items-center space-x-2">
        <Checkbox 
          id="ewm" 
          checked={isEwmEnabled}
          onCheckedChange={(checked) => {
            onParamChange('ewm', checked);
            // If EWMA is being turned off, reset parameter type to 'window'
            if (!checked) {
              onParamChange('ptype', 'window');
            }
          }}
          disabled={isLoading}
        />
          <Label htmlFor="ewm" className="text-sm font-medium leading-none cursor-pointer">
            Use Exponentially Weighted Moving Average
          </Label>
        </div>
      </div>
      
      {/* Parameter type selector - only enabled when ewm is true */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="ptype" className="text-right">
          Parameter Type
        </Label>
        <div className="col-span-3">
          <Select
            disabled={isLoading || !isEwmEnabled}
            value={params.ptype || 'window'}
            onValueChange={(value) => onParamChange('ptype', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parameter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="window">Window</SelectItem>
              <SelectItem value="alpha">Alpha</SelectItem>
              <SelectItem value="halflife">Halflife</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}