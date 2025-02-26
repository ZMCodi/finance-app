// app/strategy/components/CombinedStrategyControls.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CombinedStrategyControlsProps {
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  isLoading: boolean;
  onOptimizeWeights?: () => Promise<void>;
  onApplyChanges: () => Promise<void>;
}

export default function CombinedStrategyControls({
  params,
  onParamChange,
  isLoading,
  onOptimizeWeights,
  onApplyChanges
}: CombinedStrategyControlsProps) {
  // Handle number input change (convert string to number)
  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onParamChange(key, numValue);
  };

  return (
    <div className="mb-4 pb-4 border-b">
      {/* Title with buttons */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium">Strategy Parameters</h4>
        <div className="flex gap-2">
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
          <Button 
            variant="default" 
            size="sm" 
            onClick={onApplyChanges}
            disabled={isLoading}
            className="h-8"
          >
            Apply Changes
          </Button>
        </div>
      </div>
      
      {/* Voting Method & Threshold */}
      <div className="grid grid-cols-8 items-center gap-4">
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
    </div>
  );
}