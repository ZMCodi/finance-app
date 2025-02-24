// app/strategy/components/ChartControls.tsx
'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ChartControlsProps = {
  activeTab: string;
  showVolume: boolean;
  showIndicators: boolean;
  startDate?: Date;
  endDate?: Date;
  onTabChange: (value: string) => void;
  onVolumeChange: (show: boolean) => void;
  onIndicatorsChange: (show: boolean) => void;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
};

export default function ChartControls({
  activeTab,
  showVolume,
  showIndicators,
  startDate,
  endDate,
  onTabChange,
  onVolumeChange,
  onIndicatorsChange,
  onStartDateChange,
  onEndDateChange
}: ChartControlsProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 ml-auto">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <Checkbox
            id="volume"
            checked={showVolume}
            onCheckedChange={(checked) => onVolumeChange(checked as boolean)}
          />
          <Label htmlFor="volume" className="ml-2">Volume</Label>
        </div>
        
        <div className="flex items-center">
          <Checkbox
            id="indicators"
            checked={showIndicators}
            onCheckedChange={(checked) => onIndicatorsChange(checked as boolean)}
          />
          <Label htmlFor="indicators" className="ml-2">Indicators</Label>
        </div>
      </div>
      
      {/* Timeframe Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={onTabChange}
        className="w-[120px]"
      >
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="5m" className="text-xs px-1">5-Min</TabsTrigger>
          <TabsTrigger value="1d" className="text-xs px-1">Daily</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Date Range Controls */}
      <div className="flex items-center space-x-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal h-8 text-xs w-32",
                !startDate && "text-muted-foreground"
              )}
              size="sm"
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {startDate ? format(startDate, "dd-MM-yyyy") : <span>Start</span>}
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
        
        <span className="font-bold">-</span>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal h-8 text-xs w-32",
                !endDate && "text-muted-foreground"
              )}
              size="sm"
            >
              <CalendarIcon className="mr-1 h-3 w-3" />
              {endDate ? format(endDate, "dd-MM-yyyy") : <span>End</span>}
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
    </div>
  );
}