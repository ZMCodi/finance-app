// app/strategy/components/IndicatorPanel.tsx
'use client';

import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Types of indicators available
export type IndicatorType = 'MA Crossover' | 'RSI' | 'MACD' | 'Bollinger Bands';

// Map indicator type to strategy API name
export const strategyNameMap: Record<IndicatorType, string> = {
  'MA Crossover': 'ma_crossover',
  'RSI': 'rsi',
  'MACD': 'macd',
  'Bollinger Bands': 'bb'
};

// Props for the IndicatorPanel component
type IndicatorPanelProps = {
  onSelectIndicator: (indicator: IndicatorType) => void;
  activeIndicators: IndicatorType[];
};

export default function IndicatorPanel({
  onSelectIndicator,
  activeIndicators = []
}: IndicatorPanelProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">Add Indicator</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => onSelectIndicator('MA Crossover')}
          disabled={activeIndicators.includes('MA Crossover')}
          className="text-sm"
        >
          MA Crossover
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelectIndicator('RSI')}
          disabled={activeIndicators.includes('RSI')}
          className="text-sm"
        >
          RSI
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelectIndicator('MACD')}
          disabled={activeIndicators.includes('MACD')}
          className="text-sm"
        >
          MACD
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelectIndicator('Bollinger Bands')}
          disabled={activeIndicators.includes('Bollinger Bands')}
          className="text-sm"
        >
          Bollinger Bands
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}