// app/strategy/components/IndicatorButton.tsx
'use client';

import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, LineChart, FolderPlus, X } from 'lucide-react';
import { IndicatorType } from './IndicatorPanel';

type IndicatorButtonProps = {
  indicator: IndicatorType;
  onRemove?: (indicator: IndicatorType) => void;
  onConfigure?: (indicator: IndicatorType) => void;
  onOptimize?: (indicator: IndicatorType) => void;
  onGenerateSignal?: (indicator: IndicatorType) => void;
  onAddToStrategy?: (indicator: IndicatorType) => void;
};

export default function IndicatorButton({
  indicator,
  onRemove,
  onConfigure,
  onOptimize,
  onGenerateSignal,
  onAddToStrategy
}: IndicatorButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 bg-slate-800 text-white hover:bg-slate-700 border-slate-700"
        >
          {indicator}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={() => onConfigure?.(indicator)}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Configure</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onOptimize?.(indicator)}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Optimize</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onGenerateSignal?.(indicator)}
          className="cursor-pointer"
        >
          <LineChart className="mr-2 h-4 w-4" />
          <span>Generate Signal</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onAddToStrategy?.(indicator)}
          className="cursor-pointer"
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          <span>Add to Strategy</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onRemove?.(indicator)}
          className="cursor-pointer text-red-500 hover:text-red-600"
        >
          <X className="mr-2 h-4 w-4" />
          <span>Remove</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}