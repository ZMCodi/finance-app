'use client';

import { useState } from 'react';
import AssetChart from "./AssetChart";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ChartLine, ChartCandlestick, ChartNoAxesColumn, ChartSpline } from 'lucide-react';

interface AssetCardProps {
  ticker: string;
}

export default function AssetCard({ ticker }: AssetCardProps) {
  const [selectedPlot, setSelectedPlot] = useState<'price_history' | 'candlestick' | 'returns_distribution' | 'SMA'>('price_history');

  const chartTypes = [
    { type: 'price_history', label: <ChartLine /> },
    { type: 'candlestick', label: <ChartCandlestick /> },
    { type: 'returns_distribution', label: <ChartNoAxesColumn /> },
    { type: 'SMA', label: <ChartSpline /> }
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{ticker} Charts</span>
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