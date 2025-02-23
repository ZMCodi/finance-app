'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AssetChart from "@/components/AssetChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, LineChart, ChartNoAxesColumn, CandlestickChart } from "lucide-react";

interface AssetCardProps {
  ticker: string;
  onDelete: (ticker: string) => void;
}

export default function AssetCard({ ticker, onDelete }: AssetCardProps) {
  const router = useRouter();
  const [selectedPlot, setSelectedPlot] = useState<'price_history' | 'candlestick' | 'returns_distribution'>('price_history');

  const chartTypes = [
    { type: 'price_history', label: <LineChart /> },
    { type: 'candlestick', label: <CandlestickChart /> },
    { type: 'returns_distribution', label: <ChartNoAxesColumn /> },
  ] as const;

  const handleTickerClick = () => {
    router.push(`/assets/${ticker}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleTickerClick}
              className="hover:text-blue-500 transition-colors"
            >
              <span className="underline">{ticker} Charts</span>
            </button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6"
              onClick={() => onDelete(ticker)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {chartTypes.map(({ type, label }) => (
              <Button 
                key={type}
                variant={selectedPlot === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlot(type)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AssetChart ticker={ticker} plot_type={selectedPlot} />
      </CardContent>
    </Card>
  );
}