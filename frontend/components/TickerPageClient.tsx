'use client';
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import ChartTypeSelector from '@/components/ChartTypeSelector';
import ChartDisplay from '@/components/ChartDisplay';

interface TickerPageClientProps {
  ticker: string;
}

export default function TickerPageClient({ ticker }: TickerPageClientProps) {
  const [chartType, setChartType] = useState('price_history');
  const [chartSettings, setChartSettings] = useState({});

  const handleSettingsApply = (newSettings: any) => {
    setChartSettings(newSettings);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{ticker} Analysis</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ChartTypeSelector 
          chartType={chartType}
          setChartType={setChartType}
          onSettingsApply={handleSettingsApply}
        />
        <ChartDisplay 
          ticker={ticker}
          chartType={chartType}
          chartSettings={chartSettings}
        />
      </div>
    </div>
  );
}