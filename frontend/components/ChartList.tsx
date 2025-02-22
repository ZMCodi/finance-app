'use client';

import AssetCard from "./AssetCard";

interface ChartListProps {
  tickers: string[];
  onDeleteTicker: (ticker: string) => void;
}

export default function ChartList({ tickers, onDeleteTicker }: ChartListProps) {
  return (
    <div className="grid gap-4">
      {tickers.map((ticker) => (
        <AssetCard 
          key={ticker} 
          ticker={ticker} 
          onDelete={onDeleteTicker}
        />
      ))}
    </div>
  );
}