// app/strategy/components/CombinedStrategyIndicatorRow.tsx
import { ChevronDown, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { IndicatorType } from './IndicatorPanel';
import { CombinedStrategyIndicator } from '../hooks/useStrategyOperations';

interface CombinedStrategyIndicatorRowProps {
  indicator: CombinedStrategyIndicator;
  onConfigure: (indicatorType: IndicatorType, strategyId: string) => void;
  onRemove: (strategyId: string) => void;
  isLoading?: boolean;
}

export default function CombinedStrategyIndicatorRow({
  indicator,
  onConfigure,
  onRemove,
  isLoading = false
}: CombinedStrategyIndicatorRowProps) {
  const { strategyId, indicatorType, weight } = indicator;
  
  return (
    <li className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
      <div className="flex items-center gap-2">
        <span className="font-medium">{indicatorType}</span>
        <span className="text-xs text-gray-500">ID: {strategyId.substring(0, 8)}...</span>
        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
          Weight: {weight}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
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