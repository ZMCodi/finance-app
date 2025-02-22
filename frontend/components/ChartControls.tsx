'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ChartControlsProps {
  chartType: string;
  onApply: (settings: any) => void;
}

export default function ChartControls({ chartType, onApply }: ChartControlsProps) {
  // Common settings
  const [timeframe, setTimeframe] = useState('1d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Returns distribution settings
  const [useLogReturns, setUseLogReturns] = useState(false);
  const [numBins, setNumBins] = useState('100');

  // Candlestick settings
  const [showVolume, setShowVolume] = useState(true);
  const [resample, setResample] = useState('');

  const handleApply = () => {
    // Build settings object based on chart type
    const baseSettings = {
      timeframe,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    let specificSettings = {};
    switch (chartType) {
      case 'returns_distribution':
        specificSettings = {
          log_returns: useLogReturns,
          bins: parseInt(numBins),
        };
        break;
      case 'candlestick':
        specificSettings = {
          volume: showVolume,
          resample: resample || undefined,
        };
        break;
    }

    onApply({ ...baseSettings, ...specificSettings });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Common Controls */}
        <div className="space-y-2">
          <Label>Timeframe</Label>
          <Select value={timeframe} onValueChange={setTimeframe}>
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
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>
        </div>

        {/* Chart-specific Controls */}
        {chartType === 'returns_distribution' && (
          <>
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
          </>
        )}

        {chartType === 'candlestick' && (
          <>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="volume"
                checked={showVolume}
                onCheckedChange={(checked) => setShowVolume(checked as boolean)}
              />
              <Label htmlFor="volume">Show Volume</Label>
            </div>

            <div className="space-y-2">
              <Label>Resample Period (Optional)</Label>
              <Select value={resample} onValueChange={setResample}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="W">Weekly</SelectItem>
                  <SelectItem value="M">Monthly</SelectItem>
                  <SelectItem value="Q">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button className="w-full" onClick={handleApply}>
          Apply Changes
        </Button>
      </CardContent>
    </Card>
  );
}