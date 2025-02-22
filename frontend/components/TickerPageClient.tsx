'use client';
import { useState } from 'react';
import ChartTypeSelector from '@/components/ChartTypeSelector';
import ChartDisplay from '@/components/ChartDisplay';
import AssetInfo from './AssetInfo';

interface TickerPageClientProps {
  ticker: string;
}

export default function TickerPageClient({ ticker }: TickerPageClientProps) {
  const [chartType, setChartType] = useState('price_history');
  const [queryString, setQueryString] = useState('');

  const handleSettingsApply = (newQueryString: string) => {
    setQueryString(newQueryString);
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
          queryString={queryString}
        />
      </div>
      <AssetInfo ticker={ticker} />
    </div>
  );
}