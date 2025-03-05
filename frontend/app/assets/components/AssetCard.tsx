'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AssetChart from "@/components/AssetChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, LineChart, ChartNoAxesColumn, CandlestickChart } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import WatchlistButton from './WatchlistButton';

interface AssetCardProps {
  ticker: string;
  onDelete: (ticker: string) => void;
  onAddToWatchlist?: (ticker: string) => void;
  onRemoveFromWatchlist?: (ticker: string) => void;
}

export default function AssetCard({ 
  ticker, 
  onDelete, 
  onAddToWatchlist, 
  onRemoveFromWatchlist 
}: AssetCardProps) {
  const router = useRouter();
  const [selectedPlot, setSelectedPlot] = useState<'price_history' | 'candlestick' | 'returns_distribution'>('price_history');
  
  // Track which charts have been loaded
  const [loadedCharts, setLoadedCharts] = useState<Record<string, boolean>>({
    price_history: false,
    candlestick: false,
    returns_distribution: false
  });

  const chartTypes = [
    { type: 'price_history', label: <LineChart /> },
    { type: 'candlestick', label: <CandlestickChart /> },
    { type: 'returns_distribution', label: <ChartNoAxesColumn /> },
  ] as const;

  // Mark the initial chart type as loaded when component mounts
  useEffect(() => {
    setLoadedCharts(prev => ({
      ...prev,
      [selectedPlot]: true
    }));
  }, [selectedPlot]);

  const handleTickerClick = () => {
    router.push(`/assets/details?ticker=${ticker}`);
  };

  const handleChartTypeChange = (type: 'price_history' | 'candlestick' | 'returns_distribution') => {
    setSelectedPlot(type);
    
    // Mark this chart type as loaded
    setLoadedCharts(prev => ({
      ...prev,
      [type]: true
    }));
  };

  const handleChartLoad = (type: 'price_history' | 'candlestick' | 'returns_distribution') => {
    setLoadedCharts(prev => ({
      ...prev,
      [type]: true
    }));
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
            <WatchlistButton 
              ticker={ticker} 
              onAddToWatchlist={onAddToWatchlist}
              onRemoveFromWatchlist={onRemoveFromWatchlist}
            />
            {chartTypes.map(({ type, label }) => (
              <Button 
                key={type}
                variant={selectedPlot === type ? "default" : "outline"}
                size="sm"
                onClick={() => handleChartTypeChange(type)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedPlot} className="h-full">
          {chartTypes.map(({ type }) => (
            <TabsContent key={type} value={type} className="h-full mt-0">
              {loadedCharts[type] ? (
                <AssetChart 
                  ticker={ticker} 
                  plot_type={type} 
                  skipFetch={loadedCharts[type]}
                  onLoad={() => handleChartLoad(type)}
                />
              ) : (
                <AssetChart 
                  ticker={ticker} 
                  plot_type={type}
                  onLoad={() => handleChartLoad(type)}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}