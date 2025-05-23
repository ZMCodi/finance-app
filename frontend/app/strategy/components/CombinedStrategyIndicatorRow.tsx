// app/strategy/components/CombinedStrategyIndicatorRow.tsx
import { ChevronDown, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { IndicatorType } from './IndicatorPanel';
import { CombinedStrategyIndicator } from '../hooks/useStrategyOperations';
import { useEffect, useState } from 'react';

interface CombinedStrategyIndicatorRowProps {
  indicator: CombinedStrategyIndicator;
  onConfigure: (indicatorType: IndicatorType, strategyId: string) => void;
  onRemove: (strategyId: string) => void;
  onWeightChange: (strategyId: string, weight: number) => void;
  isLoading?: boolean;
  isWeightEditable?: boolean;
}

export default function CombinedStrategyIndicatorRow({
  indicator,
  onConfigure,
  onRemove,
  onWeightChange,
  isLoading = false,
  isWeightEditable = true
}: CombinedStrategyIndicatorRowProps) {
  const { strategyId, indicatorType, weight } = indicator;
  
  // Keep a local weight state to track changes
  const [localWeight, setLocalWeight] = useState(weight);
  
  // Update local weight when the indicator's weight changes (e.g., from optimization)
  useEffect(() => {
    setLocalWeight(weight);
  }, [weight]);
  
  // Handle local weight change
  const handleWeightChange = (value: string) => {
    const newWeight = parseFloat(value) || 0;
    setLocalWeight(newWeight);
    onWeightChange(strategyId, newWeight);
  };
  
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1.5 m-1 mt-0">
      <span className="font-medium text-xs m-1">{indicatorType}</span>
      
        <Input
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={localWeight.toFixed(2)}
          onChange={(e) => handleWeightChange(e.target.value)}
          disabled={isLoading || !isWeightEditable}
          className="h-6 w-14 text-xs px-0.5 py-0.5"
        />
        
        {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 w-5 p-0"
            disabled={isLoading}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onConfigure(indicatorType, strategyId)}
            disabled={isLoading}
            className="text-xs py-1.5"
          >
            <Settings className="mr-1.5 h-3 w-3" />
            <span>Configure</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
        onClick={() => onRemove(strategyId)}
        disabled={isLoading}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}