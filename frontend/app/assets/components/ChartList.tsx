'use client';

import AssetCard from "@/app/assets/components/AssetCard";

interface ChartListProps {
  tickers: string[];
  onDeleteTicker: (ticker: string) => void;
  onAddToWatchlist?: (ticker: string) => void;
  onRemoveFromWatchlist?: (ticker: string) => void;
}

export default function ChartList({ 
  tickers, 
  onDeleteTicker, 
  onAddToWatchlist, 
  onRemoveFromWatchlist 
}: ChartListProps) {
  return (
    <div className="grid gap-4">
      {tickers.map((ticker) => (
        <AssetCard 
          key={ticker} 
          ticker={ticker} 
          onDelete={onDeleteTicker}
          onAddToWatchlist={onAddToWatchlist}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
        />
      ))}
    </div>
  );
}