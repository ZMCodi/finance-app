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
    <li className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
      <div className="flex items-center gap-2 flex-1">
        <span className="font-medium">{indicatorType}</span>
        <span className="text-xs text-gray-500">ID: {strategyId.substring(0, 8)}...</span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Weight Input */}
        <div className="w-20">
          <Input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={localWeight}
            onChange={(e) => handleWeightChange(e.target.value)}
            disabled={isLoading || !isWeightEditable}
            className="h-8 text-sm"
          />
        </div>
        
        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onConfigure(indicatorType, strategyId)}
              disabled={isLoading}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Configure</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => onRemove(strategyId)}
              className="text-red-600 focus:text-red-600"
              disabled={isLoading}
            >
              <X className="mr-2 h-4 w-4" />
              <span>Remove from Strategy</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}