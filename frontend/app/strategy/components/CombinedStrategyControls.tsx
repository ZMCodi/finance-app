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
  // Success message state
  const [optimizeSuccess, setOptimizeSuccess] = useState(false);
  
  // Handle number input change (convert string to number)
  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onParamChange(key, numValue);
  };

  // Enhance optimize weights to show success message
  const handleOptimizeWeights = async () => {
    if (!onOptimizeWeights) return;
    
    try {
      await onOptimizeWeights();
      
      // Show success message
      setOptimizeSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setOptimizeSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error optimizing weights:', error);
    }
  };

  return (
    <div className="mb-3 pb-3 border-b">
      {/* Title and controls in one line */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-4">
          <h4 className="font-medium text-sm">Strategy Parameters</h4>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="method" className="text-xs">Method</Label>
            <Select
              disabled={isLoading}
              value={params.method || 'weighted'}
              onValueChange={(value) => onParamChange('method', value)}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted">Weighted</SelectItem>
                <SelectItem value="unanimous">Unanimous</SelectItem>
                <SelectItem value="majority">Majority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="vote_threshold" className="text-xs">Threshold</Label>
            <Input
              id="vote_threshold"
              type="number"
              min="0"
              max="100"
              step="1"
              className="w-16 h-7 text-xs"
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
        
        <div className="flex gap-2">
          {onOptimizeWeights && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOptimizeWeights}
              disabled={isLoading}
              className="h-7 text-xs px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Optimize
            </Button>
          )}
          <Button 
            variant="default" 
            size="sm" 
            onClick={onApplyChanges}
            disabled={isLoading}
            className="h-7 text-xs px-2"
          >
            Apply
          </Button>
        </div>
      </div>
      
      {/* Success Message */}
      {optimizeSuccess && (
        <div className="mb-2 p-1.5 bg-green-50 border border-green-200 rounded text-green-600 text-xs">
          Weights optimized successfully!
        </div>
      )}
    </div>
  );
}