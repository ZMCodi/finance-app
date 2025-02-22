'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssetChart from '@/components/AssetChart';
import ChartControls from '@/components/ChartControls';

interface TickerPageProps {
  params: {
    ticker: string;
  };
}

export default function TickerPage({ params }: TickerPageProps) {
  const { ticker } = params;
  const [chartType, setChartType] = useState('price_history');
  const [chartSettings, setChartSettings] = useState({});

  const handleSettingsApply = (newSettings: any) => {
    setChartSettings(newSettings);
    // Here you would trigger a chart update with the new settings
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{ticker} Analysis</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart Type Selection */}
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

            {/* Chart Controls */}
            <div className="lg:col-span-1 pt-4">
            <ChartControls 
                chartType={chartType}
                onApply={handleSettingsApply}
            />
            </div>
          </CardContent>
        </Card>

        {/* Chart Display */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <AssetChart 
              ticker={ticker}
              plot_type={chartType as any}
              {...chartSettings}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}