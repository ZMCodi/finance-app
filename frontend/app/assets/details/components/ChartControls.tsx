// app/assets/[ticker]/components/ChartControls.tsx
'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChartControlsProps {
  chartType: string;
  onApply: (queryString: string) => void;
}

export default function ChartControls({ chartType, onApply }: ChartControlsProps) {
  // Price & Candlestick settings
  const [timeframe, setTimeframe] = useState('1d');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [resample, setResample] = useState('');

  // Candlestick specific
  const [showVolume, setShowVolume] = useState(false);

  // Returns distribution settings
  const [useLogReturns, setUseLogReturns] = useState(false);
  const [numBins, setNumBins] = useState('100');

  // Set default start date when timeframe changes to 5m
  useEffect(() => {
    if (timeframe === '5m') {
      // Set default start date to 15 days ago for 5m data
      const defaultFiveMinStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      setStartDate(defaultFiveMinStart);
    }
  }, [timeframe]);

  const buildQueryString = (settings: any) => {
    const params = new URLSearchParams();

    // Filter out undefined/null values and convert to query params
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle date objects
        if (value instanceof Date) {
          params.append(key, format(value, "yyyy-MM-dd"));
        } 
        // Handle booleans
        else if (typeof value === 'boolean') {
          params.append(key, value.toString());
        }
        // Handle everything else
        else {
          params.append(key, value.toString());
        }
      }
    });

    return params.toString();
  };

  const handleApply = () => {
    let settings;

    if (chartType === 'returns_distribution') {
      settings = {
        timeframe,
        log_rets: useLogReturns,
        bins: parseInt(numBins),
      };
    } else {
      settings = {
        timeframe,
        start_date: startDate,
        end_date: endDate,
        resample: resample === 'none' ? undefined : resample,
        ...(chartType === 'candlestick' && { volume: showVolume }),
      };
    }

    const queryString = buildQueryString(settings);
    console.log(queryString);
    onApply(queryString); // Now passing the query string instead of settings object
  };

  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    
    // If changing to 5m, set the default start date to 15 days ago
    if (value === '5m') {
      const defaultFiveMinStart = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      setStartDate(defaultFiveMinStart);
    }
  };

  if (chartType === 'returns_distribution') {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Timeframe</Label>
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Since 2020</SelectItem>
              <SelectItem value="5m">Past 60 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="logReturns"
              checked={useLogReturns}
              onCheckedChange={(checked) => setUseLogReturns(checked as boolean)}
            />
            <Label htmlFor="logReturns">Use Log Returns</Label>
          </div>

          <div className="space-y-2">
            <Label>Number of Bins</Label>
            <Input
              type="number"
              value={numBins}
              onChange={(e) => setNumBins(e.target.value)}
              min="10"
              max="1000"
            />
          </div>

          <Button className="w-full" onClick={handleApply}>
            Apply Changes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label>Timeframe</Label>
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Daily</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range (Optional)</Label>
          <div className="grid gap-2">
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon />
                    {startDate ? format(startDate, "dd-MM-yyyy") : <span>Start Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon />
                    {endDate ? format(endDate, "dd-MM-yyyy") : <span>End Date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Resample Period (Optional)</Label>
          <Select value={resample} onValueChange={setResample}>
            <SelectTrigger>
              <SelectValue placeholder="Select period..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="W">Weekly</SelectItem>
              <SelectItem value="ME">Monthly</SelectItem>
              <SelectItem value="QE">Quarterly</SelectItem>
              <SelectItem value="6ME">Semi-Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {chartType === 'candlestick' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="volume"
              checked={showVolume}
              onCheckedChange={(checked) => setShowVolume(checked as boolean)}
            />
            <Label htmlFor="volume">Show Volume</Label>
          </div>
        )}

        <Button className="w-full" onClick={handleApply}>
          Apply Changes
        </Button>
      </CardContent>
    </Card>
  );
}