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

  return (
    <>
      <TickerInput onAddTicker={handleAddTicker} />
      <ChartList tickers={tickers} />
    </>
  );
}