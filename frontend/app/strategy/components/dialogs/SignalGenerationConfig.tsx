// app/strategy/components/dialogs/SignalGenerationConfig.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SignalInfo {
  value: string;
  label: string;
}

interface SignalGenerationConfigProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  signalTypes: SignalInfo[];
  isLoading: boolean;
  onOptimizeWeights?: () => Promise<Record<string, any>>; // Remove indicator type parameter
}

export default function SignalGenerationConfig({
  params,
  onParamChange,
  signalTypes,
  isLoading,
  onOptimizeWeights
}: SignalGenerationConfigProps) {

  // Handle number input change (convert string to number)
  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onParamChange(key, numValue);
  };

  return (
    <div>
      {/* Title with Optimize Button */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Signal Generation Parameters</h4>
        {onOptimizeWeights && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOptimizeWeights}
            disabled={isLoading}
            className="h-8 flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="text-xs">Optimize Weights</span>
          </Button>
        )}
      </div>
      
      {/* Voting Method & Threshold */}
      <div className="grid grid-cols-8 items-center gap-4 mt-2">
        <Label htmlFor="method" className="text-right col-span-2">
          Voting Method
        </Label>
        <div className="col-span-2">
          <Select
            disabled={isLoading}
            value={params.method || 'weighted'}
            onValueChange={(value) => onParamChange('method', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weighted">Weighted</SelectItem>
              <SelectItem value="unanimous">Unanimous</SelectItem>
              <SelectItem value="majority">Majority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Label htmlFor="vote_threshold" className="text-right col-span-2">
          Vote Threshold
        </Label>
        <div className="col-span-2">
        <Input
          id="vote_threshold"
          type="number"
          min="0"
          max="100"
          step="1"
          className="w-full"
          value={
            // Convert threshold to percentage of signals that must agree
            Math.round(((params.vote_threshold ?? 0) + 1) / 2 * 100)
          }
          onChange={(e) => {
            // Convert percentage back to -1 to 1 scale threshold
            const percentValue = Number(e.target.value);
            const thresholdValue = (percentValue / 100 * 2) - 1;
            handleNumberChange('vote_threshold', thresholdValue);
          }}
          disabled={isLoading || params.method === 'unanimous'}
        />
        </div>
      </div>
      
      {/* Signal Types */}
      <div className="mt-4">
        <Label className="font-medium">Signal Types</Label>
        <div className="mt-2 space-y-2">
          {signalTypes.map((signal) => (
            <div key={signal.value} className="grid grid-cols-8 items-center gap-2">
              <div className="col-span-4 flex items-center space-x-2">
                <Checkbox 
                  id={`signal_${signal.value}`} 
                  checked={(params.signal_type || []).includes(signal.value)}
                  onCheckedChange={(checked) => {
                    // Update signal_type array
                    const currentSignals = params.signal_type || [];
                    let newSignals;
                    
                    if (checked) {
                      newSignals = [...currentSignals, signal.value];
                      
                      // Update weights if needed
                      const weights = [...(params.weights || [])];
                      // Default weight based on number of possible signals
                      const defaultWeight = 1 / signalTypes.length;
                      weights.push(parseFloat(defaultWeight.toFixed(2))); 
                      onParamChange('weights', weights);
                    } else {
                      newSignals = currentSignals.filter(s => s !== signal.value);
                      
                      // Update weights if needed
                      const index = currentSignals.indexOf(signal.value);
                      if (index !== -1) {
                        const weights = [...(params.weights || [])];
                        weights.splice(index, 1);
                        onParamChange('weights', weights);
                      }
                    }
                    
                    onParamChange('signal_type', newSignals);
                  }}
                  disabled={isLoading}
                />
                <Label htmlFor={`signal_${signal.value}`} className="text-sm cursor-pointer">
                  {signal.label}
                </Label>
              </div>
              
              <div className="col-span-4">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={
                    (params.signal_type || []).includes(signal.value)
                      ? (params.weights || [])[
                          (params.signal_type || []).indexOf(signal.value)
                        ] || 0
                      : 0
                  }
                  onChange={(e) => {
                    // Update weight for this signal type
                    const currentSignals = params.signal_type || [];
                    const index = currentSignals.indexOf(signal.value);
                    if (index !== -1) {
                      const weights = [...(params.weights || [])];
                      weights[index] = parseFloat(e.target.value);
                      onParamChange('weights', weights);
                    }
                  }}
                  disabled={isLoading || params.method !== 'weighted' || !(params.signal_type || []).includes(signal.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}