'use client';

import AssetChart from "@/components/AssetChart";

interface ChartListProps {
  tickers: string[];
}

export default function ChartList({ tickers }: ChartListProps) {
  return (
    <div className="grid gap-4">
      {tickers.map((ticker) => (
        <AssetChart key={ticker} ticker={ticker} plot_type="price_history" />
      ))}
    </div>
  );
}