// app/strategy/components/ChartControls.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, CalendarIcon, Settings, RefreshCw, LineChart, FolderPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import IndicatorPanel, { IndicatorType } from './IndicatorPanel';

interface ChartControlsProps {
  activeTab: string;
  showVolume: boolean;
  activeIndicators: IndicatorType[];
  startDate?: Date;
  endDate?: Date;
  isLoading?: boolean;
  onTabChange: (tab: string) => void;
  onVolumeChange: (show: boolean) => void;
  onSelectIndicator: (indicator: IndicatorType) => void;
  onRemoveIndicator: (indicator: IndicatorType) => void;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
  onConfigureIndicator: (indicator: IndicatorType) => void;
  onOptimizeIndicator: (indicator: IndicatorType) => void;
  onGenerateSignal: (indicator: IndicatorType) => void;
  onAddToStrategy: (indicator: IndicatorType) => void;
}

export default function ChartControls({
  activeTab,
  showVolume,
  activeIndicators,
  startDate,
  endDate,
  isLoading = false,
  onTabChange,
  onVolumeChange,
  onSelectIndicator,
  onRemoveIndicator,
  onStartDateChange,
  onEndDateChange,
  onConfigureIndicator,
  onOptimizeIndicator,
  onGenerateSignal,
  onAddToStrategy
}: ChartControlsProps) {
  // State for active popover
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  // State for indicator menu
  const [activeMenuIndicator, setActiveMenuIndicator] = useState<IndicatorType | null>(null);
  
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Timeframe Selector */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="mr-2">
        <TabsList className="h-8">
          <TabsTrigger value="5m" className="text-xs px-3">5-Min</TabsTrigger>
          <TabsTrigger value="1d" className="text-xs px-3">Daily</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Volume Toggle */}
      <div className="flex items-center space-x-1">
        <Switch 
          id="volume" 
          checked={showVolume} 
          onCheckedChange={onVolumeChange} 
        />
        <label htmlFor="volume" className="text-xs cursor-pointer">
          Volume
        </label>
      </div>
      
      {/* Date Range */}
      <div className="flex items-center space-x-1">
        {/* Start Date */}
        <Popover open={activePopover === 'start-date'} onOpenChange={(open) => {
          setActivePopover(open ? 'start-date' : null);
        }}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 flex items-center gap-1 text-xs px-2 py-1"
            >
              <CalendarIcon className="h-3 w-3" />
              {startDate ? format(startDate, 'MMM d, yyyy') : 'Start Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        {/* End Date */}
        <Popover open={activePopover === 'end-date'} onOpenChange={(open) => {
          setActivePopover(open ? 'end-date' : null);
        }}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 flex items-center gap-1 text-xs px-2 py-1"
            >
              <CalendarIcon className="h-3 w-3" />
              {endDate ? format(endDate, 'MMM d, yyyy') : 'End Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Indicator Selector */}
      <IndicatorPanel 
        onSelectIndicator={onSelectIndicator} 
        activeIndicators={activeIndicators} 
      />
      
      {/* Active Indicators Display */}
      <div className="flex flex-wrap gap-1">
        {activeIndicators.map((indicator) => (
          <div 
            key={indicator} 
            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 text-xs"
          >
            <span>{indicator}</span>
            
            {/* Indicator Actions Menu */}
            <DropdownMenu
              open={activeMenuIndicator === indicator}
              onOpenChange={(open) => {
                setActiveMenuIndicator(open ? indicator : null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 rounded-full"
                  disabled={isLoading}
                >
                  <ChevronDown className="h-3 w-3" />
                  {isLoading && <RefreshCw className="h-3 w-3 animate-spin ml-1" />}
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onConfigureIndicator(indicator)}
                  disabled={isLoading}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configure</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => onOptimizeIndicator(indicator)}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>Optimize</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => onGenerateSignal(indicator)}
                  disabled={isLoading}
                >
                  <LineChart className="mr-2 h-4 w-4" />
                  <span>Generate Signal</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => onAddToStrategy(indicator)}
                  disabled={isLoading}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  <span>Add to Strategy</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Remove Indicator Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
              onClick={() => onRemoveIndicator(indicator)}
              disabled={isLoading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}