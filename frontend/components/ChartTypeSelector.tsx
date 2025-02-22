'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChartControls from '@/components/ChartControls';

interface ChartTypeSelectorProps {
  chartType: string;
  setChartType: (value: string) => void;
  onSettingsApply: (settings: any) => void;
}

export default function ChartTypeSelector({ 
  chartType, 
  setChartType, 
  onSettingsApply 
}: ChartTypeSelectorProps) {
  return (
    <Card className="lg:col-span-1">
      <CardContent className="pt-6">
        <Select value={chartType} onValueChange={setChartType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price_history">Price History</SelectItem>
            <SelectItem value="candlestick">Candlestick</SelectItem>
            <SelectItem value="returns_distribution">Returns Distribution</SelectItem>
          </SelectContent>
        </Select>
        <div className='pt-3'>
          <ChartControls 
            chartType={chartType}
            onApply={onSettingsApply}
          />
        </div>
      </CardContent>
    </Card>
  );
}