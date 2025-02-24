'use client';
import { useState } from 'react';
import ChartTypeSelector from '@/app/assets/[ticker]/components/ChartTypeSelector';
import ChartDisplay from '@/app/assets/[ticker]/components/ChartDisplay';
import AssetInfo from '@/app/assets/[ticker]/components/AssetInfo';
import AssetTitle from '@/app/assets/[ticker]/components/AssetTitle';

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
    <div className="p-4 w-full mx-auto">
      <AssetTitle ticker={ticker} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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