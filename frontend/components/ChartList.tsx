'use client';

import AssetCard from "./AssetCard";

interface ChartListProps {
  tickers: string[];
}

export default function ChartList({ tickers }: ChartListProps) {
  return (
    <div className="grid gap-4">
      {tickers.map((ticker) => (
        <AssetCard key={ticker} ticker={ticker} />
      ))}
    </div>
  );
}