'use client';

import { useState } from 'react';
import TickerInput from "./TickerInput";
import ChartList from "./ChartList";

export default function ChartContainer() {
  const [tickers, setTickers] = useState<string[]>([]);

  const handleAddTicker = (newTicker: string) => {
    if (!tickers.includes(newTicker)) {
      setTickers(prev => [...prev, newTicker]);
    }
  };

  const handleDeleteTicker = (tickerToDelete: string) => {
    setTickers(prev => prev.filter(ticker => ticker !== tickerToDelete));
  };

  return (
    <>
      <TickerInput onAddTicker={handleAddTicker} />
      <ChartList 
        tickers={tickers} 
        onDeleteTicker={handleDeleteTicker}
      />
    </>
  );
}